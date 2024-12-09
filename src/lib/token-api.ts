"use server";

import { JobStatus, TokenAPI } from "zkcloudworker";
import { JobResult, TokenTransaction } from "@minatokens/api";
import { getChain } from "./chain";

const ZKCW_JWT = process.env.ZKCW_JWT;
const chain = getChain();

function getAPI(): TokenAPI {
  if (ZKCW_JWT === undefined) throw new Error("ZKCW_JWT is undefined");
  return new TokenAPI({
    jwt: ZKCW_JWT,
    chain,
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
