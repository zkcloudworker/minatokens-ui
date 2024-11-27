"use server";

import { JobId, JobResult, ApiResponse } from "./types";
import { TokenAPI } from "zkcloudworker";
import { getChain } from "@/lib/chain";

const ZKCW_JWT = process.env.ZKCW_JWT;
const chain = getChain();

export async function jobResult(
  params: JobId,
  apiKeyAddress: string
): Promise<ApiResponse<JobResult>> {
  const { jobId } = params;

  if (
    !jobId ||
    typeof jobId !== "string" ||
    jobId.startsWith("zkCW") === false
  ) {
    return {
      status: 400,
      json: { error: "Invalid jobId" },
    };
  }

  if (ZKCW_JWT === undefined) throw new Error("ZKCW_JWT is undefined");
  const api = new TokenAPI({
    jwt: ZKCW_JWT,
    chain,
  });

  const result = await api.getResult(jobId);
  if (!result) {
    return {
      status: 500,
      json: { error: "Failed to get job result" },
    };
  }

  return {
    status: 200,
    json: result,
  };
}
