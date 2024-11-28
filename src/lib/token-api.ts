"use server";

import { TokenAPI } from "zkcloudworker";
import {
  DeployTransaction,
  JobResult,
  TokenTransaction,
} from "@minatokens/api";
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

export async function sendDeployTransaction(
  params: DeployTransaction
): Promise<string | undefined> {
  const api = getAPI();
  return api.sendDeployTransaction(params);
}

export async function sendTokenTransaction(
  params: TokenTransaction
): Promise<string | undefined> {
  const api = getAPI();
  return api.sendTransaction(params);
}

export async function getResult(jobId: string): Promise<JobResult> {
  const api = getAPI();
  return await api.getResult(jobId);
}
