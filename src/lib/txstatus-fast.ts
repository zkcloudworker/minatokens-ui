"use server";
import { checkZkappTransaction } from "o1js";
import { initBlockchain, sleep } from "zkcloudworker";
import { getChain } from "./chain";
import { debug } from "./debug";
const DEBUG = debug();
import { getTxStatus } from "./txstatus";
const chain = getChain();

export async function getTxStatusFast(params: {
  hash: string;
}): Promise<{ success: boolean; result?: boolean; error?: string }> {
  if (chain === "zeko") return { success: true, result: true };
  const { hash } = params;
  await initBlockchain(chain);

  try {
    const txStatus = await checkZkappTransaction(hash);
    // if (DEBUG) {
    //   if (txStatus.success === true) {
    //     getTxStatusSlow(hash);
    //   }
    // }
    return {
      success: true,
      result: txStatus?.success ?? false,
    };
  } catch (error: any) {
    console.error(
      "getTxStatusFast error while getting tx status - catch",
      hash,
      error
    );
    return { success: false, error: error?.message ?? "Cannot get tx status" };
  }
}

async function getTxStatusSlow(hash: string) {
  const time = Date.now();
  if (DEBUG)
    console.log("getTxStatusSlow start", hash, new Date(time).toISOString());
  let count = 0;
  while (count < 60 * 10) {
    const slowStatus = await getTxStatus({ hash });
    if (slowStatus && slowStatus?.txStatus === "applied") {
      const time2 = Date.now();
      const timeDiff = (time2 - time) / 1000;
      if (DEBUG) console.log("slowStatus", slowStatus);
      if (DEBUG) console.log("getTxStatusSlow timeDiff", timeDiff);
      return;
    } else {
      if (DEBUG && slowStatus)
        console.log("getTxStatusSlow sleep", count, slowStatus?.txStatus);
      await sleep(10000);
    }
    count++;
  }
}
