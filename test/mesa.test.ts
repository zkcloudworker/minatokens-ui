import { describe, it, after } from "node:test";
import assert from "node:assert";
import { PrivateKey } from "o1js";
import { encryptPrivateKey, decryptPrivateKey } from "@/lib/mesa/encrypt";
import {
  saveMesaPrivateKey,
  saveMesaPrivateKeys,
  getMesaPrivateKey,
} from "@/lib/mesa/keys";
import { MesaKeyPersistenceError, withRetry } from "@/lib/mesa/retry";
import { prisma } from "@/lib/db";

// Exercises the EXACT functions the app ships with (encrypt/decrypt + the
// save/get server actions) against the real database, so the tests cover the
// production code path. Requires the following in .env.local:
//   MESA_ENCRYPTION_KEY=<base64 32 bytes>
//   NEXT_PUBLIC_MESA_TESTNET_SAVE_PRIVATE_KEYS=true
// Run: npm run mesa:test

// Never let a test post to Slack (the alert path reads SLACK_WEBHOOK_URL).
process.env.SLACK_WEBHOOK_URL = "";

// Hardcoded devnet test keypair (a consistent pair; only stored in the dev DB).
const TEST_PUBLIC_KEY = "B62qn4f3zJYHBRtuJe3qomQ148AfTBCGUzyfvvvdtvjS91P8Ssz5HnX";
const TEST_PRIVATE_KEY = "EKFLejrn8YQLYwdGKA4JA41CmSveAWKYRmkPrbGFBh4ELE1y6B35";

const createdPublicKeys = new Set<string>();

function randomKey() {
  const key = PrivateKey.random();
  const publicKey = key.toPublicKey().toBase58();
  createdPublicKeys.add(publicKey);
  return { privateKey: key.toBase58(), publicKey };
}

describe("Mesa private key persistence", () => {
  it("generate -> encrypt -> save -> read -> decrypt -> compare (shipping functions)", async () => {
    const { privateKey, publicKey } = randomKey();

    // Crypto round trip through the exact helpers the app uses.
    assert.strictEqual(
      decryptPrivateKey(encryptPrivateKey(privateKey)),
      privateKey
    );

    await saveMesaPrivateKey({
      publicKey,
      privateKey,
      walletAddress: null,
      operation: "TOKEN_LAUNCH",
      accountType: "MAIN",
      chain: "mina_devnet",
      source: "api",
      context: { test: true, role: "token" },
    });

    const recovered = await getMesaPrivateKey(publicKey);
    assert.strictEqual(recovered, privateKey);
  });

  it("hardcoded public key -> fetch private key from db -> derive public key -> compare", async () => {
    createdPublicKeys.add(TEST_PUBLIC_KEY);

    await saveMesaPrivateKey({
      publicKey: TEST_PUBLIC_KEY,
      privateKey: TEST_PRIVATE_KEY,
      walletAddress: null,
      operation: "TOKEN_LAUNCH",
      accountType: "MAIN",
      chain: "mina_devnet",
      source: "api",
      context: { test: true, role: "token" },
    });

    const privateKey = await getMesaPrivateKey(TEST_PUBLIC_KEY);
    assert.ok(
      privateKey,
      "private key should be found for the hardcoded public key"
    );
    const derivedPublicKey = PrivateKey.fromBase58(privateKey!)
      .toPublicKey()
      .toBase58();
    assert.strictEqual(derivedPublicKey, TEST_PUBLIC_KEY);
  });

  it("saveMesaPrivateKeys persists a batch (token + admin) atomically", async () => {
    const token = randomKey();
    const admin = randomKey();
    await saveMesaPrivateKeys([
      {
        publicKey: token.publicKey,
        privateKey: token.privateKey,
        operation: "TOKEN_LAUNCH",
        accountType: "MAIN",
        chain: "mina_devnet",
        source: "api",
        context: { test: true, role: "token" },
      },
      {
        publicKey: admin.publicKey,
        privateKey: admin.privateKey,
        operation: "TOKEN_LAUNCH",
        accountType: "MAIN",
        chain: "mina_devnet",
        source: "api",
        context: { test: true, role: "admin" },
      },
    ]);
    assert.strictEqual(await getMesaPrivateKey(token.publicKey), token.privateKey);
    assert.strictEqual(await getMesaPrivateKey(admin.publicKey), admin.privateKey);
  });

  it("fail-closed: saveMesaPrivateKey THROWS MesaKeyPersistenceError when persistence fails", async () => {
    const { privateKey, publicKey } = randomKey();
    const realKey = process.env.MESA_ENCRYPTION_KEY;
    // Force an encryption failure (config error) -> save must throw, not swallow.
    process.env.MESA_ENCRYPTION_KEY = "not-a-valid-32-byte-key";
    try {
      await assert.rejects(
        saveMesaPrivateKey({
          publicKey,
          privateKey,
          operation: "TOKEN_LAUNCH",
          accountType: "MAIN",
          chain: "mina_devnet",
          source: "api",
          context: { test: true },
        }),
        (error: unknown) => error instanceof MesaKeyPersistenceError
      );
    } finally {
      process.env.MESA_ENCRYPTION_KEY = realKey;
    }
    // And nothing was persisted for that key.
    assert.strictEqual(await getMesaPrivateKey(publicKey), null);
  });

  it("getMesaPrivateKey returns null for an absent key but THROWS on a decrypt error", async () => {
    // Absent key -> null (genuine not-found).
    const absent = PrivateKey.random().toPublicKey().toBase58();
    assert.strictEqual(await getMesaPrivateKey(absent), null);

    // Seed a real row, then corrupt the key so decrypt fails -> must throw,
    // NOT return null (a redeploy must not mistake an error for "absent").
    const { privateKey, publicKey } = randomKey();
    await saveMesaPrivateKey({
      publicKey,
      privateKey,
      operation: "TOKEN_LAUNCH",
      accountType: "MAIN",
      chain: "mina_devnet",
      source: "api",
      context: { test: true },
    });
    const realKey = process.env.MESA_ENCRYPTION_KEY;
    process.env.MESA_ENCRYPTION_KEY = Buffer.from(
      "00000000000000000000000000000000",
      "utf8"
    ).toString("base64"); // valid 32 bytes, but wrong key -> auth tag fails
    try {
      await assert.rejects(
        getMesaPrivateKey(publicKey),
        (error: unknown) => error instanceof MesaKeyPersistenceError
      );
    } finally {
      process.env.MESA_ENCRYPTION_KEY = realKey;
    }
  });

  it("gate off: saveMesaPrivateKeys is a no-op and does not throw", async () => {
    const { privateKey, publicKey } = randomKey();
    const flag = process.env.NEXT_PUBLIC_MESA_TESTNET_SAVE_PRIVATE_KEYS;
    process.env.NEXT_PUBLIC_MESA_TESTNET_SAVE_PRIVATE_KEYS = "false";
    try {
      await saveMesaPrivateKeys([
        {
          publicKey,
          privateKey,
          operation: "TOKEN_LAUNCH",
          accountType: "MAIN",
          chain: "mina_devnet",
          source: "api",
        },
      ]);
    } finally {
      process.env.NEXT_PUBLIC_MESA_TESTNET_SAVE_PRIVATE_KEYS = flag;
    }
    assert.strictEqual(await getMesaPrivateKey(publicKey), null);
  });

  it("withRetry retries then rethrows, and succeeds after a transient failure", async () => {
    let calls = 0;
    await assert.rejects(
      withRetry(
        async () => {
          calls++;
          throw new Error("transient");
        },
        { attempts: 4, baseDelayMs: 1 }
      ),
      (e: unknown) => e instanceof Error && e.message === "transient"
    );
    assert.strictEqual(calls, 4, "should attempt exactly `attempts` times");

    let calls2 = 0;
    const value = await withRetry(
      async () => {
        calls2++;
        if (calls2 < 3) throw new Error("transient");
        return "ok";
      },
      { attempts: 5, baseDelayMs: 1 }
    );
    assert.strictEqual(value, "ok");
    assert.strictEqual(calls2, 3, "should stop retrying once it succeeds");
  });

  after(async () => {
    if (createdPublicKeys.size > 0) {
      await prisma.mesaPrivateKey.deleteMany({
        where: { publicKey: { in: [...createdPublicKeys] } },
      });
    }
    await prisma.$disconnect();
  });
});
