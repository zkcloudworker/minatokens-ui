"use server";
import { getNonce, fetchMinaAccount, initBlockchain } from "zkcloudworker";
import { Mina, PublicKey } from "o1js";
import { getChain } from "./chain";
const chain = getChain();
const BLOCKBERRY_API = process.env.BLOCKBERRY_API;

export async function getAccountNonce(account: string): Promise<number> {
  if (BLOCKBERRY_API === undefined)
    throw new Error("BLOCKBERRY_API is undefined");
  if (chain === "zeko") {
    await initBlockchain(chain);
    const publicKey = PublicKey.fromBase58(account);
    await fetchMinaAccount({ publicKey });
    const nonce = Number(Mina.getAccount(publicKey).nonce.toBigint());
    return nonce;
  } else {
    const blockberryNoncePromise = getNonce({
      account,
      blockBerryApiKey: BLOCKBERRY_API,
      chain,
    });
    await initBlockchain(chain);
    const publicKey = PublicKey.fromBase58(account);
    await fetchMinaAccount({ publicKey });
    const senderNonce = Number(Mina.getAccount(publicKey).nonce.toBigint());
    const blockberryNonce = (await blockberryNoncePromise).nonce ?? -1;
    const nonce = Math.max(senderNonce, blockberryNonce + 1);
    if (nonce > senderNonce)
      console.log(
        `Nonce changed from ${senderNonce} to ${nonce} for ${account}`
      );
    return nonce;
  }
}
