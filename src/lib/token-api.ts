"use server";

import {
  TokenAPI,
  FungibleTokenDeployParams,
  FungibleTokenMintParams,
  FungibleTokenTransferParams,
  FungibleTokenJobResult,
} from "zkcloudworker";
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
  params: FungibleTokenDeployParams
): Promise<string | undefined> {
  const api = getAPI();
  return api.sendDeployTransaction(params);
}

export async function sendMintTransaction(
  params: FungibleTokenMintParams
): Promise<string | undefined> {
  const api = getAPI();
  return api.sendMintTransaction(params);
}

export async function sendTransferTransaction(
  params: FungibleTokenTransferParams
): Promise<string | undefined> {
  const api = getAPI();
  return api.sendTransferTransaction(params);
}

export async function getResult(
  jobId: string
): Promise<FungibleTokenJobResult | undefined> {
  const api = getAPI();
  return await api.getResult(jobId);
}
