"use client";

export type Libraries = {
  o1js: typeof import("o1js");
  //minaProver: typeof import("@silvana-one/mina-prover");
  minaUtils: typeof import("@silvana-one/mina-utils");
  api: typeof import("@silvana-one/api");
  storage: typeof import("@silvana-one/storage");
  tokens: typeof import("@silvana-one/token");
  abi: typeof import("@silvana-one/abi");
};

let libraries: Libraries | null = null;

export async function loadLibraries(): Promise<Libraries> {
  if (libraries) {
    return libraries;
  }
  const o1jsPromise = import("o1js");
  //const minaProverPromise = import("@silvana-one/mina-prover");
  const minaUtilsPromise = import("@silvana-one/mina-utils");
  const apiPromise = import("@silvana-one/api");
  const storagePromise = import("@silvana-one/storage");
  const tokensPromise = import("@silvana-one/token");
  const abiPromise = import("@silvana-one/abi");
  const o1js = await o1jsPromise;
  //const minaProver = await minaProverPromise;
  const minaUtils = await minaUtilsPromise;
  const api = await apiPromise;
  const storage = await storagePromise;
  const tokens = await tokensPromise;
  const abi = await abiPromise;
  libraries = { o1js, minaUtils, api, storage, tokens, abi };
  return libraries;
}
