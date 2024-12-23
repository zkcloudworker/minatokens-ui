"use server";
import { algoliasearch } from "algoliasearch";
import { searchClient } from "@algolia/client-search";
import { algoliaGetToken, algoliaWriteToken } from "./algolia";
import { getChain } from "./chain";
import { debug } from "./debug";
import { log as logtail } from "@logtail/next";

const chain = getChain();
const log = logtail.with({
  service: "likes",
  chain,
});
const DEBUG = debug();

const { ALGOLIA_KEY, ALGOLIA_PROJECT } = process.env;

export interface Like {
  tokenAddress: string;
  userAddress: string;
}

export async function algoliaWriteLike(params: Like): Promise<boolean> {
  const { tokenAddress, userAddress } = params;
  if (ALGOLIA_KEY === undefined) throw new Error("ALGOLIA_KEY is undefined");
  if (ALGOLIA_PROJECT === undefined)
    throw new Error("ALGOLIA_PROJECT is undefined");
  try {
    const client = algoliasearch(ALGOLIA_PROJECT, ALGOLIA_KEY);
    const indexName = `token-likes-${chain}`;
    if (DEBUG) console.log("algoliaWriteLike", params, indexName);
    const objectID = tokenAddress + "." + userAddress;
    if (!(await algoliaGetLike({ tokenAddress, userAddress }))) {
      const likes = await algoliaLikesCount({ tokenAddress });
      const timestamp = Date.now();
      const data = {
        objectID,
        tokenAddress,
        userAddress,
        timestamp,
      };

      const result = await client.saveObject({
        indexName,
        body: data,
      });
      if (result.taskID === undefined) {
        log.error("algoliaWriteLike: Algolia write result is", { result });
        return false;
      }

      const info = await algoliaGetToken({ tokenAddress });

      if (
        info !== undefined &&
        likes !== undefined &&
        (info.likes === undefined || info.likes <= likes)
      ) {
        info.likes = likes + 1;
        info.updated = timestamp;
        await algoliaWriteToken({ tokenAddress, info });
      }
    }

    return true;
  } catch (error) {
    log.error("algoliaWriteLike: error", { error, params });
    return false;
  }
}

export async function algoliaGetLike(params: Like): Promise<boolean> {
  if (ALGOLIA_KEY === undefined) throw new Error("ALGOLIA_KEY is undefined");
  if (ALGOLIA_PROJECT === undefined)
    throw new Error("ALGOLIA_PROJECT is undefined");
  try {
    const { tokenAddress, userAddress } = params;
    const client = algoliasearch(ALGOLIA_PROJECT, ALGOLIA_KEY);
    const indexName = `token-likes-${chain}`;
    const objectID = tokenAddress + "." + userAddress;
    //if (DEBUG) console.log("algoliaGetLike", params, indexName);
    const result = await client.getObject({
      indexName,
      objectID,
    });
    //if (DEBUG) console.log("algoliaGetLike result:", result);
    return true;
  } catch (error: any) {
    return false;
  }
}

export async function algoliaLikesCount(params: {
  tokenAddress: string;
}): Promise<number> {
  const { tokenAddress } = params;
  if (ALGOLIA_KEY === undefined) throw new Error("ALGOLIA_KEY is undefined");
  if (ALGOLIA_PROJECT === undefined)
    throw new Error("ALGOLIA_PROJECT is undefined");

  try {
    const client = searchClient(ALGOLIA_PROJECT, ALGOLIA_KEY);
    const indexName = `token-likes-${chain}`;
    //if (DEBUG) console.log("algoliaLikesCount", params, indexName);
    const result = await client.searchForFacetValues({
      indexName,
      facetName: "tokenAddress",
      searchForFacetValuesRequest: {
        facetQuery: tokenAddress,
        maxFacetHits: 1,
      },
    });

    //if (DEBUG) console.log("algoliaLikesCount result:", result);
    return result?.facetHits[0]?.count ?? 0;
  } catch (error: any) {
    log.error("algoliaLikesCount: error", {
      error: error?.message ?? String(error),
      params,
    });
    return 0;
  }
}

export async function algoliaGetUsersLikes(params: {
  userAddress: string;
}): Promise<string[]> {
  //if (DEBUG) console.log("algoliaGetUsersLikes start", params);
  const { userAddress } = params;
  if (ALGOLIA_KEY === undefined) throw new Error("ALGOLIA_KEY is undefined");
  if (ALGOLIA_PROJECT === undefined)
    throw new Error("ALGOLIA_PROJECT is undefined");

  try {
    const client = searchClient(ALGOLIA_PROJECT, ALGOLIA_KEY);
    const indexName = `token-likes-${chain}`;
    //if (DEBUG) console.log("algoliaGetUsersLikes", params, indexName);
    const result = await client.searchSingleIndex({
      indexName,
      searchParams: {
        query: "",
        hitsPerPage: 1000,
        page: 0,
        facetFilters: [`userAddress:${userAddress}`],
        attributesToRetrieve: ["tokenAddress"],
      },
    });

    //if (DEBUG) console.log("algoliaGetUsersLikes result:", result);
    return (
      result?.hits?.map((elm) => (elm as unknown as Like).tokenAddress) ?? []
    );
  } catch (error: any) {
    log.error("algoliaGetUsersLikes: error", {
      error: error?.message ?? String(error),
      params,
    });
    return [];
  }
}
