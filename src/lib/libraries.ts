"use client";

export type Libraries = {
  o1js: typeof import("o1js");
  zkcloudworker: typeof import("zkcloudworker");
};

let libraries: Libraries | null = null;

export async function loadLibraries(): Promise<Libraries> {
  if (libraries) {
    return libraries;
  }
  const o1jsPromise = import("o1js");
  const zkcloudworkerPromise = import("zkcloudworker");
  const o1js = await o1jsPromise;
  const zkcloudworker = await zkcloudworkerPromise;
  libraries = { o1js, zkcloudworker };
  return libraries;
}

/*
// lib/loadO1js.js
export async function loadO1js(version) {
  if (version === "1.9.0") {
    return await import("https://cdn.jsdelivr.net/npm/o1js@1.9.0/dist/index.js");
  } else if (version === "2.0.0") {
    return await import("https://cdn.jsdelivr.net/npm/o1js@2.0.0/dist/index.js");
  } else {
    throw new Error(`Unsupported version: ${version}`);
  }
}

// lib/loadO1js.js
export async function loadO1js(version) {
  if (version === "1.9.0") {
    return await import("https://cdn.jsdelivr.net/npm/o1js@1.9.0/dist/index.js");
  } else if (version === "2.0.0") {
    return await import("https://cdn.jsdelivr.net/npm/o1js@2.0.0/dist/index.js");
  } else {
    throw new Error(`Unsupported version: ${version}`);
  }
}
npm install o1js@1.9.0 o1js2@npm:o1js@2.0.0
const o1js_v1 = await import("o1js");
const o1js_v2 = await import("o1js2");

*/
