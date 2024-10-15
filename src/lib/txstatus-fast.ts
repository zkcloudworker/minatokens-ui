"use server";
import { checkZkappTransaction } from "o1js";
import { initBlockchain } from "zkcloudworker";
import { getChain } from "./chain";
const chain = getChain();

export async function getTxStatusFast(params: {
  hash: string;
}): Promise<{ success: boolean; result?: boolean; error?: string }> {
  if (chain === "zeko") return { success: true, result: true };
  const { hash } = params;
  await initBlockchain(chain);

  try {
    const txStatus = await checkZkappTransaction(hash);
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
