"use server";
import { algoliasearch } from "algoliasearch";
const { ALGOLIA_KEY, ALGOLIA_PROJECT } = process.env;
import { DeployedTokenInfo } from "./token";
import { getChain } from "./chain";
import { debug } from "./debug";
const chain = getChain();
const DEBUG = debug();

10_000_000_000_000_000_000

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
    };

    const result = await client.saveObject({
      indexName,
      body: data,
    });
    if (result.taskID === undefined) {
      console.error("algoliaWriteToken: Algolia write result is", result);
      return false;
    }

    return true;
  } catch (error) {
    console.error("algoliaWriteToken error:", { error, params });
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
    console.log("algoliaGetToken result:", result);
    return result as unknown as DeployedTokenInfo | undefined;
  } catch (error: any) {
    console.error("algoliaGetToken error:", {
      error: error?.message ?? String(error),
      params,
    });
    return undefined;
  }
}
