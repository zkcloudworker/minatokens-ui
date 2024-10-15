"use server";
import { initBlockchain } from "zkcloudworker";
import { Mina } from "o1js";
import { getChain } from "./chain";
import { debug } from "./debug";
const DEBUG = debug();
const chain = getChain();

export async function sendTransaction(transaction: string): Promise<{
  hash?: string;
  status: string;
  success: boolean;
  error?: any;
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
      if (DEBUG)
        console.log(
          `tx NOT sent: hash: ${txSent?.hash} status: ${txSent?.status}`,
          txSent.errors
        );
      return { success: false, status: txSent.status, error: txSent.errors };
    }
  } catch (error) {
    console.error("sendTransaction catch", error);
    return { success: false, status: "error", error: error };
  }
}
