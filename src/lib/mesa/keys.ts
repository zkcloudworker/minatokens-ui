"use server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { encryptPrivateKey, decryptPrivateKey } from "@/lib/mesa/encrypt";
import { withRetry, MesaKeyPersistenceError } from "@/lib/mesa/retry";
import type { SaveMesaPrivateKeyInput } from "@/lib/mesa/types";
import { log as logtail } from "@logtail/next";

const log = logtail.with({ service: "mesa-keys" });

const RETRY = { attempts: 5, baseDelayMs: 150 };

// Persisting private keys is gated to testnet/devnet. In production the flag is
// false/unset, so this is a hard no-op even if the action is somehow invoked.
function saveEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MESA_TESTNET_SAVE_PRIVATE_KEYS === "true";
}

// Best-effort ops alert on a persistence failure. NEVER includes the plaintext
// private key. A Slack failure must not mask the original persistence error.
async function alertPersistenceFailure(
  publicKeys: string[],
  operation: string,
  error: unknown
): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      // Bounded so a slow/hung webhook can never stall the fail-closed error
      // path (the 503 response / client launch abort).
      signal: AbortSignal.timeout(3000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text:
          ":rotating_light: Mesa key persistence FAILED — key(s) NOT saved; " +
          "the account would be unrecoverable after the Mesa upgrade.\n" +
          `*operation:* ${operation}\n*publicKeys:* ${publicKeys.join(", ")}\n` +
          `*error:* ${error instanceof Error ? error.message : String(error)}`,
      }),
    });
  } catch (slackError) {
    log.error("alertPersistenceFailure: Slack notify failed", { slackError });
  }
}

function toData(input: SaveMesaPrivateKeyInput) {
  return {
    encryptedPrivateKey: encryptPrivateKey(input.privateKey),
    walletAddress: input.walletAddress ?? null,
    operation: input.operation,
    accountType: input.accountType,
    mainAccountPublicKey: input.mainAccountPublicKey ?? null,
    chain: input.chain,
    source: input.source ?? null,
    context: (input.context ?? Prisma.JsonNull) as Prisma.InputJsonValue,
  };
}

/**
 * Encrypt and persist one or more generated Mina private keys ATOMICALLY for the
 * Mesa VK redeploy.
 *
 * - No-op unless NEXT_PUBLIC_MESA_TESTNET_SAVE_PRIVATE_KEYS === "true".
 * - Retries transient DB errors with exponential backoff.
 * - FAIL-CLOSED: on final failure it THROWS MesaKeyPersistenceError. Callers
 *   MUST let this abort the operation so no account is ever deployed without its
 *   private key persisted (otherwise it is unrecoverable after Mesa).
 * - Upserts keyed on publicKey, so retries and re-attempts are idempotent.
 */
export async function saveMesaPrivateKeys(
  inputs: SaveMesaPrivateKeyInput[]
): Promise<void> {
  if (!saveEnabled() || inputs.length === 0) return;
  const publicKeys = inputs.map((i) => i.publicKey);
  const operation = String(inputs[0]?.operation ?? "unknown");
  try {
    // Encrypt up-front: a config/encryption error surfaces immediately, and the
    // whole batch commits atomically in a single transaction.
    const rows = inputs.map((input) => ({
      publicKey: input.publicKey,
      data: toData(input),
    }));
    await withRetry(
      () =>
        // Array-form batch transaction — atomic (all-or-nothing). Relies on the
        // connection being transaction-pooled (Neon's pooled endpoint is), so
        // the whole BEGIN..COMMIT runs on one pooled connection.
        prisma.$transaction(
          rows.map((r) =>
            prisma.mesaPrivateKey.upsert({
              where: { publicKey: r.publicKey },
              update: r.data,
              create: { publicKey: r.publicKey, ...r.data },
            })
          )
        ),
      {
        ...RETRY,
        onRetry: (error, attempt) =>
          log.warn("saveMesaPrivateKeys retry", { attempt, publicKeys, error }),
      }
    );
  } catch (error) {
    log.error("saveMesaPrivateKeys failed after retries", {
      error,
      publicKeys,
      operation,
    });
    await alertPersistenceFailure(publicKeys, operation, error);
    throw new MesaKeyPersistenceError(
      `Failed to persist Mesa private key(s) for ${publicKeys.join(", ")}`,
      { cause: error }
    );
  }
}

/** Single-key convenience wrapper around saveMesaPrivateKeys. Fail-closed. */
export async function saveMesaPrivateKey(
  input: SaveMesaPrivateKeyInput
): Promise<void> {
  return saveMesaPrivateKeys([input]);
}

/**
 * Fetch and decrypt a stored private key by its public key. Used by the Mesa
 * redeploy tooling and tests. Returns null ONLY when no row exists; THROWS
 * MesaKeyPersistenceError on a persistent read or decrypt error, so the
 * redeploy never mistakes a transient failure for an absent key. Server-only.
 */
export async function getMesaPrivateKey(
  publicKey: string
): Promise<string | null> {
  let row;
  try {
    row = await withRetry(
      () => prisma.mesaPrivateKey.findUnique({ where: { publicKey } }),
      {
        ...RETRY,
        onRetry: (error, attempt) =>
          log.warn("getMesaPrivateKey retry", { attempt, publicKey, error }),
      }
    );
  } catch (error) {
    log.error("getMesaPrivateKey read failed after retries", {
      error,
      publicKey,
    });
    throw new MesaKeyPersistenceError(
      `Failed to read Mesa private key for ${publicKey}`,
      { cause: error }
    );
  }
  if (!row) return null;
  try {
    return decryptPrivateKey(row.encryptedPrivateKey);
  } catch (error) {
    log.error("getMesaPrivateKey decrypt failed", { error, publicKey });
    throw new MesaKeyPersistenceError(
      `Failed to decrypt Mesa private key for ${publicKey}`,
      { cause: error }
    );
  }
}

/**
 * The wallet recorded as the creator/owner when this key was saved (or null if
 * none/unknown). No key material is read. Used to authorize use of the stored
 * key for a Mesa upgrade — only the recorded owner may sign via the DB key.
 */
export async function getMesaKeyOwner(
  publicKey: string
): Promise<string | null> {
  try {
    const row = await withRetry(
      () =>
        prisma.mesaPrivateKey.findUnique({
          where: { publicKey },
          select: { walletAddress: true },
        }),
      {
        ...RETRY,
        onRetry: (error, attempt) =>
          log.warn("getMesaKeyOwner retry", { attempt, publicKey, error }),
      }
    );
    return row?.walletAddress ?? null;
  } catch (error) {
    log.error("getMesaKeyOwner failed after retries", { error, publicKey });
    throw new MesaKeyPersistenceError(
      `Failed to read Mesa key owner for ${publicKey}`,
      { cause: error }
    );
  }
}

/**
 * Whether a private key is stored for the given public key. Returns a boolean
 * only — no key material is read or decrypted. Used by the Mesa upgrade UI to
 * show the "saved in DB" status. Throws on a persistent DB error (so the UI can
 * distinguish "not saved" from "could not check").
 */
export async function isMesaPrivateKeySaved(publicKey: string): Promise<boolean> {
  try {
    const count = await withRetry(
      () => prisma.mesaPrivateKey.count({ where: { publicKey } }),
      {
        ...RETRY,
        onRetry: (error, attempt) =>
          log.warn("isMesaPrivateKeySaved retry", { attempt, publicKey, error }),
      }
    );
    return count > 0;
  } catch (error) {
    log.error("isMesaPrivateKeySaved failed after retries", { error, publicKey });
    throw new MesaKeyPersistenceError(
      `Failed to check Mesa private key for ${publicKey}`,
      { cause: error }
    );
  }
}
