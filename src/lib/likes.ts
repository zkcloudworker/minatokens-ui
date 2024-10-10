"use server";
import { algoliasearch } from "algoliasearch";
import { searchClient } from "@algolia/client-search";
const { ALGOLIA_KEY, ALGOLIA_PROJECT } = process.env;

const chain = process.env.NEXT_PUBLIC_CHAIN;
const DEBUG = process.env.NEXT_PUBLIC_DEBUG === "true";

export interface Like {
  tokenAddress: string;
  userAddress: string;
}

export async function algoliaWriteLike(params: {
  tokenAddress: string;
  userAddress: string;
}): Promise<boolean> {
  const { tokenAddress, userAddress } = params;
  if (chain === undefined) throw new Error("NEXT_PUBLIC_CHAIN is undefined");
  if (chain !== "devnet" && chain !== "mainnet")
    throw new Error("NEXT_PUBLIC_CHAIN must be devnet or mainnet");
  if (ALGOLIA_KEY === undefined) throw new Error("ALGOLIA_KEY is undefined");
  if (ALGOLIA_PROJECT === undefined)
    throw new Error("ALGOLIA_PROJECT is undefined");
  try {
    const client = algoliasearch(ALGOLIA_PROJECT, ALGOLIA_KEY);
    const indexName = `token-likes-${chain}`;
    if (DEBUG) console.log("algoliaWriteLike", params, indexName);
    const objectID = tokenAddress + "." + userAddress;
    if (!(await algoliaGetLike({ tokenAddress, userAddress }))) {
      const data = {
        objectID,
        tokenAddress,
        userAddress,
      };

      const result = await client.saveObject({
        indexName,
        body: data,
      });
      if (result.taskID === undefined) {
        console.error("algoliaWriteToken: Algolia write result is", result);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("algoliaWriteToken error:", { error, params });
    return false;
  }
}

export async function algoliaGetLike(params: Like): Promise<boolean> {
  if (chain === undefined) throw new Error("NEXT_PUBLIC_CHAIN is undefined");
  if (chain !== "devnet" && chain !== "mainnet")
    throw new Error("NEXT_PUBLIC_CHAIN must be devnet or mainnet");
  if (ALGOLIA_KEY === undefined) throw new Error("ALGOLIA_KEY is undefined");
  if (ALGOLIA_PROJECT === undefined)
    throw new Error("ALGOLIA_PROJECT is undefined");
  try {
    const client = algoliasearch(ALGOLIA_PROJECT, ALGOLIA_KEY);
    const indexName = `token-likes-${chain}`;
    //if (DEBUG) console.log("algoliaGetLike", params, indexName);
    const result = await client.getObject({
      indexName,
      objectID: params.tokenAddress,
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
  if (chain === undefined) throw new Error("NEXT_PUBLIC_CHAIN is undefined");
  if (chain !== "devnet" && chain !== "mainnet")
    throw new Error("NEXT_PUBLIC_CHAIN must be devnet or mainnet");
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
    console.error("algoliaLikesCount error:", {
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
  if (chain === undefined) throw new Error("NEXT_PUBLIC_CHAIN is undefined");
  if (chain !== "devnet" && chain !== "mainnet")
    throw new Error("NEXT_PUBLIC_CHAIN must be devnet or mainnet");
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
    console.error("algoliaGetUsersLikes error:", {
      error: error?.message ?? String(error),
      params,
    });
    return [];
  }
}
