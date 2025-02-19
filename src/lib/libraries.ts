"use client";

export type Libraries = {
  o1js: typeof import("o1js");
  zkcloudworker: typeof import("zkcloudworker");
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
  const zkcloudworkerPromise = import("zkcloudworker");
  const apiPromise = import("@silvana-one/api");
  const storagePromise = import("@silvana-one/storage");
  const tokensPromise = import("@silvana-one/token");
  const abiPromise = import("@silvana-one/abi");
  const o1js = await o1jsPromise;
  const zkcloudworker = await zkcloudworkerPromise;
  const api = await apiPromise;
  const storage = await storagePromise;
  const tokens = await tokensPromise;
  const abi = await abiPromise;
  libraries = { o1js, zkcloudworker, tokens, api, storage, abi };
  return libraries;
}
