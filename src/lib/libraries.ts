"use client";

export type Libraries = {
  o1js: typeof import("o1js");
  zkcloudworker: typeof import("zkcloudworker");
  api: typeof import("@minatokens/api");
  storage: typeof import("@minatokens/storage");
  tokens: typeof import("@minatokens/token");
  abi: typeof import("@minatokens/abi");
};

let libraries: Libraries | null = null;

export async function loadLibraries(): Promise<Libraries> {
  if (libraries) {
    return libraries;
  }
  const o1jsPromise = import("o1js");
  const zkcloudworkerPromise = import("zkcloudworker");
  const apiPromise = import("@minatokens/api");
  const storagePromise = import("@minatokens/storage");
  const tokensPromise = import("@minatokens/token");
  const abiPromise = import("@minatokens/abi");
  const o1js = await o1jsPromise;
  const zkcloudworker = await zkcloudworkerPromise;
  const api = await apiPromise;
  const storage = await storagePromise;
  const tokens = await tokensPromise;
  const abi = await abiPromise;
  libraries = { o1js, zkcloudworker, tokens, api, storage, abi };
  return libraries;
}
