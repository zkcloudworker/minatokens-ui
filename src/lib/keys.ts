"use client";

import type { PrivateKey, PublicKey } from "o1js";
import { TokenDeployParams } from "./token";
import type { Libraries } from "./libraries";
import { debug } from "./debug";
const DEBUG = debug();

export async function deployTokenParams(
  lib: Libraries
): Promise<TokenDeployParams> {
  const { PrivateKey } = lib.o1js;
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
  return {
    tokenPrivateKey: token.privateKey.toBase58(),
    adminContractPrivateKey: adminContract.privateKey.toBase58(),
    tokenPublicKey: token.publicKey.toBase58(),
    adminContractPublicKey: adminContract.publicKey.toBase58(),
  };
}
