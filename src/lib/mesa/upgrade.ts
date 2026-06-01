"use server";
import {
  AccountUpdate,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  TokenId,
  UInt64,
  VerificationKey,
} from "o1js";
import { getContractInfo, tokenVerificationKeys } from "@silvana-one/abi";
import { createTransactionPayloads } from "@silvana-one/mina-utils";
import { initBlockchain, fetchMinaAccount } from "@/lib/blockchain";
import { getChain } from "@/lib/chain";
import { getAccountNonce } from "@/lib/nonce";
import { checkAddress, checkPrivateKey } from "@/lib/api/utils/address";
import {
  getMesaPrivateKey,
  isMesaPrivateKeySaved,
  getMesaKeyOwner,
} from "@/lib/mesa/keys";
import type { MesaUpgradeInfo } from "@/lib/mesa/types";
import { log as logtail } from "@logtail/next";

const chain = getChain();
const log = logtail.with({ service: "mesa-upgrade", chain });

// Default (MINA) token id in base58 — accounts at this token id are "main"
// accounts and the modal shows tokenId as "none".
const DEFAULT_TOKEN_ID = TokenId.toBase58(Field(1));
const UPGRADE_FEE = 1e8; // 0.1 MINA

function upgradeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_UPGRADE_MESA_TESTNET_KEYS === "true";
}

/**
 * Gather everything the upgrade modal shows for ONE account: matched contract
 * name, tokenId, current on-chain VK, the new VK from vk/mainnet.ts, and whether
 * the private key is saved in the DB. Gated to testnet.
 */
// If a tokenId isn't given but a parent (collection/token) address is, derive
// the token id server-side — used for individual NFTs which live at
// TokenId.derive(collectionAddress). Clients have no o1js to compute it.
function resolveTokenId(tokenId?: string, parentAddress?: string): string | undefined {
  if (tokenId) return tokenId;
  if (parentAddress && checkAddress(parentAddress)) {
    return TokenId.toBase58(TokenId.derive(PublicKey.fromBase58(parentAddress)));
  }
  return undefined;
}

export async function getMesaUpgradeInfo(params: {
  address: string;
  tokenId?: string;
  parentAddress?: string;
}): Promise<MesaUpgradeInfo | { error: string }> {
  if (!upgradeEnabled()) return { error: "Mesa upgrade is not enabled" };
  try {
    if (!checkAddress(params.address)) return { error: "Invalid address" };
    await initBlockchain();
    const resolvedTokenId = resolveTokenId(params.tokenId, params.parentAddress);
    const infos = await getContractInfo({
      address: params.address,
      tokenId: resolvedTokenId,
      chain,
    });
    const info: any =
      infos.find(
        (i: any) =>
          i?.address?.value === params.address &&
          (!resolvedTokenId || i?.tokenId?.value === resolvedTokenId)
      ) ?? infos[0];
    if (!info) return { error: "Contract info not found" };

    const name: string = info.name?.value ?? "unknown";
    const tokenId: string = info.tokenId?.value ?? DEFAULT_TOKEN_ID;
    // New VK always from mainnet.ts (per decision), keyed by the matched name.
    const vkTable = tokenVerificationKeys.mainnet.vk as Record<
      string,
      { hash: string; data: string }
    >;
    const newVkEntry = vkTable[name];

    let savedInDb = false;
    try {
      savedInDb = await isMesaPrivateKeySaved(params.address);
    } catch (error) {
      log.warn("getMesaUpgradeInfo: saved check failed", { error });
    }

    return {
      name,
      address: info.address?.value ?? params.address,
      tokenId,
      isDefaultTokenId: tokenId === DEFAULT_TOKEN_ID,
      currentVk: {
        hash: info.verificationKeyHash?.value ?? "",
        data: info.verificationKey?.value ?? "",
      },
      newVk: newVkEntry
        ? { hash: newVkEntry.hash, data: newVkEntry.data }
        : null,
      savedInDb,
    };
  } catch (error) {
    log.error("getMesaUpgradeInfo failed", { error, params });
    return {
      error: error instanceof Error ? error.message : "Failed to get upgrade info",
    };
  }
}

/**
 * Build a signature-authorized setVerificationKey transaction for ONE account.
 * The account's private key (from the DB, or supplied by the operator) signs the
 * verification-key update; the connected wallet (sender) pays + signs the fee
 * payer in the browser. No proving — authorization is by signature, which the
 * protocol accepts for setVerificationKey once the Mesa version bump is live.
 */
export async function buildMesaUpgradeTx(params: {
  address: string;
  tokenId?: string;
  parentAddress?: string;
  sender: string;
  privateKey?: string;
}): Promise<{ payloads: any; name: string } | { error: string }> {
  if (!upgradeEnabled()) return { error: "Mesa upgrade is not enabled" };
  try {
    if (!checkAddress(params.address)) return { error: "Invalid account address" };
    if (!checkAddress(params.sender)) return { error: "Invalid sender address" };
    if (params.privateKey && !checkPrivateKey(params.privateKey))
      return { error: "Invalid private key" };

    await initBlockchain();

    const resolvedTokenId = resolveTokenId(params.tokenId, params.parentAddress);
    const info = await getMesaUpgradeInfo({
      address: params.address,
      tokenId: resolvedTokenId,
    });
    if ("error" in info) return info;
    if (!info.newVk)
      return { error: `No Mesa verification key found for contract "${info.name}"` };

    // Authorization. A supplied private key proves possession (anyone holding
    // the key may upgrade). The DB-stored key may only be used by its recorded
    // owner — the caller's connected wallet (sender) must match the wallet that
    // was recorded when the key was saved. This prevents one API caller from
    // having the server sign a VK upgrade with another account's stored key.
    let accountKey = params.privateKey ?? null;
    if (!accountKey) {
      let owner: string | null = null;
      try {
        owner = await getMesaKeyOwner(params.address);
      } catch {
        owner = null;
      }
      if (!owner || owner !== params.sender) {
        return {
          error:
            "Not authorized to upgrade this account from the stored key. Connect the owner wallet or provide the account's private key.",
        };
      }
      accountKey = await getMesaPrivateKey(params.address);
    }
    if (!accountKey)
      return {
        error:
          "Private key for this account is not saved in the database. Provide it to upgrade.",
      };
    if (
      PrivateKey.fromBase58(accountKey).toPublicKey().toBase58() !==
      params.address
    )
      return { error: "Provided private key does not match the account address" };

    const accountPublicKey = PublicKey.fromBase58(params.address);
    const sender = PublicKey.fromBase58(params.sender);
    const tokenIdField = resolvedTokenId
      ? TokenId.fromBase58(resolvedTokenId)
      : undefined;
    const newVk = new VerificationKey({
      data: info.newVk.data,
      hash: Field(info.newVk.hash),
    });

    await fetchMinaAccount({ publicKey: sender, force: true });
    await fetchMinaAccount({
      publicKey: accountPublicKey,
      tokenId: tokenIdField,
      force: true,
    });

    const nonce = await getAccountNonce(params.sender);
    if (nonce === undefined) return { error: "Failed to get sender nonce" };

    const tx = await Mina.transaction(
      {
        sender,
        fee: UInt64.from(UPGRADE_FEE),
        nonce,
        memo: "Mesa VK upgrade".substring(0, 30),
      },
      async () => {
        const au = AccountUpdate.createSigned(accountPublicKey, tokenIdField);
        au.account.verificationKey.set(newVk);
      }
    );
    // Sign the verification-key update with the account's own key. The wallet
    // adds the fee-payer signature in the browser.
    tx.sign([PrivateKey.fromBase58(accountKey)]);
    const payloads = createTransactionPayloads(tx);
    return { payloads, name: info.name };
  } catch (error) {
    log.error("buildMesaUpgradeTx failed", { error, address: params.address });
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to build upgrade transaction",
    };
  }
}
