"use server";

import {
  FungibleTokenDeployParams,
  FungibleTokenMintParams,
  FungibleTokenTransferParams,
  FungibleTokenJobResult,
  TokenAPI,
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
