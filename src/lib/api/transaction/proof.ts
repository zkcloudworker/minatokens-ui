"use server";

import { JobId, JobResult } from "@silvana-one/api";
import { ApiName, ApiResponse } from "../api-types";
import { TokenAPI } from "@silvana-one/mina-prover";
import { getChain } from "@/lib/chain";

const ZKCW_JWT = process.env.ZKCW_JWT;
const chain = getChain();

export async function proof(props: {
  params: JobId;
  name: ApiName;
  apiKeyAddress: string;
}): Promise<ApiResponse<JobResult>> {
  const { params, name, apiKeyAddress } = props;
  const { jobId } = params;

  if (!jobId || typeof jobId !== "string") {
    return {
      status: 400,
      json: { error: "Invalid jobId" },
    };
  }

  if (ZKCW_JWT === undefined) throw new Error("ZKCW_JWT is undefined");
  const api = new TokenAPI({
    jwt: ZKCW_JWT,
    chain,
    repo: process.env.ZKCW_TOKEN_REPO,
  });

  const result = await api.getResults(jobId);
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
