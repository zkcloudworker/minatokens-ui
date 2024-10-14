"use server";
import { checkZkappTransaction } from "o1js";
import { initBlockchain } from "zkcloudworker";
const chain = process.env.NEXT_PUBLIC_CHAIN;

export async function getTxStatusFast(params: {
  hash: string;
}): Promise<{ success: boolean; result?: boolean; error?: string }> {
  const { hash } = params;
  if (chain === undefined) throw new Error("NEXT_PUBLIC_CHAIN is undefined");
  if (chain !== "devnet" && chain !== "mainnet")
    throw new Error("NEXT_PUBLIC_CHAIN must be devnet or mainnet");
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
