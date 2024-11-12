"use server";

import { sendDeployTransaction } from "@/lib/token-api";
import { debug } from "@/lib/debug";
import { getChain } from "@/lib/chain";
import { checkAddress } from "@/lib/address";
import { getResult } from "@/lib/api/aws-result";
import { JobId, TransactionResult, ApiResponse } from "./types";
const chain = getChain();
const DEBUG = debug();

export async function jobResult(
  params: JobId
): Promise<ApiResponse<TransactionResult>> {
  const { jobId } = params;

  if (!jobId || typeof jobId !== "string") {
    return {
      status: 400,
      json: { error: "Invalid jobId" },
    };
  }

  const result = await getResult(jobId);
  if (!result) {
    return {
      status: 500,
      json: { error: "Failed to get job result" },
    };
  }

  if (result.success) {
    return {
      status: 200,
      json: { hash: result.hash, tx: result.tx },
    };
  } else {
    return {
      status: 500,
      json: { error: result?.error ?? "Unknown error" },
    };
  }
}