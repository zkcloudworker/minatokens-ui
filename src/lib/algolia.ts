"use server";
import { algoliasearch } from "algoliasearch";
const { ALGOLIA_KEY, ALGOLIA_PROJECT } = process.env;
import { DeployedTokenInfo } from "./token";
import { getChain } from "./chain";
const chain = getChain();
import { debug } from "./debug";
import { log as logtail } from "@logtail/next";
const log = logtail.with({
  service: "algolia",
  chain,
});
const DEBUG = debug();

export async function algoliaWriteToken(params: {
  tokenAddress: string;
  info: DeployedTokenInfo;
}): Promise<boolean> {
  if (ALGOLIA_KEY === undefined) throw new Error("ALGOLIA_KEY is undefined");
  if (ALGOLIA_PROJECT === undefined)
    throw new Error("ALGOLIA_PROJECT is undefined");
  try {
    const client = algoliasearch(ALGOLIA_PROJECT, ALGOLIA_KEY);
    const indexName = `tokens-${chain}`;
    if (DEBUG) console.log("algoliaWriteToken", params, indexName);

    const data = {
      objectID: params.tokenAddress,
      ...params.info,
      algoliaVersion: 2,
    };

    const result = await client.saveObject({
      indexName,
      body: data,
    });
    if (result.taskID === undefined) {
      log.error("algoliaWriteToken: Algolia write result is", result);
      return false;
    }

    return true;
  } catch (error) {
    log.error("algoliaWriteToken error:", { error, params });
    return false;
  }
}

export async function algoliaGetToken(params: {
  tokenAddress: string;
}): Promise<DeployedTokenInfo | undefined> {
  if (ALGOLIA_KEY === undefined) throw new Error("ALGOLIA_KEY is undefined");
  if (ALGOLIA_PROJECT === undefined)
    throw new Error("ALGOLIA_PROJECT is undefined");
  try {
    const client = algoliasearch(ALGOLIA_PROJECT, ALGOLIA_KEY);
    const indexName = `tokens-${chain}`;
    if (DEBUG) console.log("algoliaGetToken", params, indexName);
    const result = await client.getObject({
      indexName,
      objectID: params.tokenAddress,
    });
    return result as unknown as DeployedTokenInfo | undefined;
  } catch (error: any) {
    log.error("algoliaGetToken error:", {
      error: error?.message ?? String(error),
      params,
    });
    return undefined;
  }
}
