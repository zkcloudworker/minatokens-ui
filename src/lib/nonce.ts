"use server";
import {
  getNonce,
  fetchMinaAccount,
  initBlockchain,
} from "@silvana-one/mina-utils";
import { Mina, PublicKey } from "o1js";
import { getChain } from "./chain";
import { log as logtail } from "@logtail/next";
const chain = getChain();
const log = logtail.with({
  service: "nonce",
  chain,
});

const BLOCKBERRY_API = process.env.BLOCKBERRY_API;

export async function getAccountNonce(
  account: string
): Promise<number | undefined> {
  if (BLOCKBERRY_API === undefined)
    throw new Error("BLOCKBERRY_API is undefined");
  // Mesa testnet (mina:testnet) and Zeko have no Blockberry indexer — read the nonce
  // straight from the chain. (Blockberry only covers mina mainnet/old-devnet, so using it
  // for mina:testnet returns the wrong devnet nonce.)
  if (chain === "zeko:testnet" || chain === "mina:testnet") {
    await initBlockchain({ chain });
    const publicKey = PublicKey.fromBase58(account);
    await fetchMinaAccount({ publicKey });
    if (!Mina.hasAccount(publicKey)) {
      log.error("getAccountNonce: account not found", { account });
      return undefined;
    }
    const nonce = Number(Mina.getAccount(publicKey).nonce.toBigint());
    return nonce;
  } else if (chain === "mina:devnet" || chain === "mina:mainnet") {
    const blockberryChain = chain === "mina:mainnet" ? "mainnet" : "devnet";
    const blockberryNoncePromise = getNonce({
      account,
      blockBerryApiKey: BLOCKBERRY_API,
      chain: blockberryChain,
    });
    await initBlockchain({ chain });
    const publicKey = PublicKey.fromBase58(account);
    await fetchMinaAccount({ publicKey });
    if (!Mina.hasAccount(publicKey)) {
      log.error("getAccountNonce: account not found", { account });
      return undefined;
    }
    const senderNonce = Number(Mina.getAccount(publicKey).nonce.toBigint());
    const blockberryNonce = (await blockberryNoncePromise).nonce ?? -1;
    const nonce = Math.max(senderNonce, blockberryNonce + 1);
    if (nonce > senderNonce)
      log.info(`Nonce changed from ${senderNonce} to ${nonce} for ${account}`);
    return nonce;
  } else {
    log.error("getAccountNonce: chain not supported", { chain });
    return undefined;
  }
}
