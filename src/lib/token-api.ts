"use server";

import { TokenAPI } from "@silvana-one/mina-prover";
import { JobStatus } from "@silvana-one/prover";
import { JobResult, TokenTransaction } from "@silvana-one/api";
import { getChain } from "./chain";

const ZKCW_JWT = process.env.ZKCW_JWT;
const chain = getChain();

function getAPI(): TokenAPI {
  if (ZKCW_JWT === undefined) throw new Error("ZKCW_JWT is undefined");
  return new TokenAPI({
    jwt: ZKCW_JWT,
    chain,
    repo: process.env.ZKCW_TOKEN_REPO,
  });
}

export async function proveTransaction(
  params: TokenTransaction
): Promise<string | undefined> {
  const api = getAPI();
  return api.proveTransaction(params);
}

export async function proveTransactions(
  params: TokenTransaction[]
): Promise<string | undefined> {
  const api = getAPI();
  return api.proveTransactions(params);
}

export async function getResult(jobId: string): Promise<
  | {
      success: true;
      results?: JobResult[];
      jobStatus?: JobStatus;
    }
  | {
      success: false;
      error?: string;
      jobStatus?: JobStatus;
    }
> {
  const api = getAPI();
  return await api.getResults(jobId);
}
