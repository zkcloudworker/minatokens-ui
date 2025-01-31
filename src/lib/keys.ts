"use client";

import type { PrivateKey, PublicKey } from "o1js";
import { TokenDeployParams } from "@/tokens/lib/token";
import type { Libraries } from "@/lib/libraries";
import { debug } from "@/lib/debug";
const DEBUG = debug();

export async function deployTokenParams(
  lib: Libraries
): Promise<TokenDeployParams> {
  const { PrivateKey, TokenId } = lib.o1js;
  const { FungibleToken } = lib.tokens;
  const token: {
    privateKey: PrivateKey;
    publicKey: PublicKey;
  } = PrivateKey.randomKeypair();
  const adminContract: {
    privateKey: PrivateKey;
    publicKey: PublicKey;
  } = PrivateKey.randomKeypair();
  if (DEBUG) console.log("token:", token.publicKey.toBase58());
  if (DEBUG) console.log("adminContract:", adminContract.publicKey.toBase58());
  const zkApp = new FungibleToken(token.publicKey);
  const tokenId = zkApp.deriveTokenId();
  return {
    tokenPrivateKey: token.privateKey.toBase58(),
    adminContractPrivateKey: adminContract.privateKey.toBase58(),
    tokenPublicKey: token.publicKey.toBase58(),
    adminContractPublicKey: adminContract.publicKey.toBase58(),
    tokenId: TokenId.toBase58(tokenId),
  };
}
