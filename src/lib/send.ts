"use server";
import { initBlockchain, accountBalanceMina } from "@silvana-one/mina-utils";
import { Mina } from "o1js";
import { getChain } from "./chain";
import { debug } from "./debug";
import { log as logtail } from "@logtail/next";
const chain = getChain();
const log = logtail.with({
  chain,
  service: "send",
});
const DEBUG = debug();

let lastHash: string | undefined = undefined;

export async function sendTransaction(transaction: string): Promise<{
  hash?: string;
  status: string;
  success: boolean;
  error?: any;
  overflow?: boolean;
  balance?: number;
}> {
  try {
    await initBlockchain(chain);
    const tx = Mina.Transaction.fromJSON(JSON.parse(transaction));
    const txSent = await tx.safeSend();
    if (txSent.status == "pending") {
      if (DEBUG)
        console.log(`tx sent: hash: ${txSent.hash} status: ${txSent.status}`);
      return { hash: txSent.hash, status: txSent.status, success: true };
    } else {
      const sender = tx.transaction?.feePayer?.body?.publicKey;
      let balance: number | undefined = undefined;
      if (sender) {
        balance = await accountBalanceMina(sender);
      }
      const overflow = txSent.errors.some(
        (error) =>
          (error as any).statusText &&
          typeof (error as any).statusText === "string" &&
          (error as any).statusText.includes("Overflow")
      );
      log.error("sendTransaction: tx NOT sent", {
        hash: txSent?.hash,
        status: txSent?.status,
        errors: txSent?.errors,
        overflow,
        sender: sender?.toBase58(),
        balance,
        nonce: tx.transaction?.feePayer?.body?.nonce?.toBigint().toString(),
        memo: tx.transaction?.memo,
        transaction: lastHash === txSent?.hash ? "already logged" : transaction,
      });
      lastHash = txSent?.hash;
      if (DEBUG)
        console.log(
          `tx NOT sent: hash: ${txSent?.hash} status: ${txSent?.status}`,
          txSent.errors
        );
      return {
        success: false,
        status: txSent.status,
        error: txSent.errors,
        overflow,
      };
    }
  } catch (error) {
    log.error("sendTransaction: catch", { error });
    return { success: false, status: "error", error: error };
  }
}
