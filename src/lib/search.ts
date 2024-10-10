"use server";
import { searchClient } from "@algolia/client-search";
import { DeployedTokenInfo } from "./token";
import { Like } from "./likes";

const { ALGOLIA_KEY, ALGOLIA_PROJECT } = process.env;
const chain = process.env.NEXT_PUBLIC_CHAIN;
const DEBUG = process.env.NEXT_PUBLIC_DEBUG === "true";

export interface TokenList {
  hits: DeployedTokenInfo[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  exhaustiveNbHits: boolean;
  exhaustiveTypo: boolean;
  exhaustive: { nbHits: boolean; typo: boolean };
  processingTimeMS: number;
  _highlightResult: any;
}

export async function algoliaGetTokenList(
  params: {
    query?: string;
    hitsPerPage?: number;
    page?: number;
    favoritesOfAddress?: string;
    ownedByAddress?: string;
  } = {}
): Promise<TokenList | undefined> {
  const { favoritesOfAddress, ownedByAddress } = params;
  if (chain === undefined) throw new Error("NEXT_PUBLIC_CHAIN is undefined");
  if (chain !== "devnet" && chain !== "mainnet")
    throw new Error("NEXT_PUBLIC_CHAIN must be devnet or mainnet");
  if (ALGOLIA_KEY === undefined) throw new Error("ALGOLIA_KEY is undefined");
  if (ALGOLIA_PROJECT === undefined)
    throw new Error("ALGOLIA_PROJECT is undefined");
  const query = params.query ?? "";
  const hitsPerPage = params.hitsPerPage ?? 100;
  const page = params.page ?? 0;
  //if (DEBUG) console.log("algoliaGetTokenList", params);
  const client = searchClient(ALGOLIA_PROJECT, ALGOLIA_KEY);
  const indexName = `tokens-${chain}`;
  const likesIndexName = `token-likes-${chain}`;

  try {
    let tokenList: TokenList | undefined = undefined;
    if (DEBUG) console.log("algoliaGetTokenList", params, indexName);
    if (favoritesOfAddress !== undefined && ownedByAddress !== undefined) {
      const likesResult = await client.searchSingleIndex({
        indexName: likesIndexName,
        searchParams: {
          query: "",
          hitsPerPage: 1000,
          page: 0,
          facetFilters: [`userAddress:${favoritesOfAddress}`],
          attributesToRetrieve: ["tokenAddress"],
        },
      });
      const likedTokens =
        likesResult?.hits?.map(
          (elm) => (elm as unknown as Like).tokenAddress
        ) ?? [];
      if (likedTokens.length > 0) {
        const filters = likedTokens
          .map((tokenAddress) => `tokenAddress:${tokenAddress}`)
          .join(" OR ");
        const result = await client.searchSingleIndex({
          indexName,
          searchParams: {
            query,
            hitsPerPage,
            page,
            facetFilters: [`adminAddress:${ownedByAddress}`],
            filters: likedTokens.length > 0 ? filters : undefined,
          },
        });
        tokenList = result?.hits ? (result as unknown as TokenList) : undefined;
      }
    } else if (favoritesOfAddress !== undefined) {
      const likesResult = await client.searchSingleIndex({
        indexName: likesIndexName,
        searchParams: {
          query: "",
          hitsPerPage: 1000,
          page: 0,
          facetFilters: [`userAddress:${favoritesOfAddress}`],
          attributesToRetrieve: ["tokenAddress"],
        },
      });
      const likedTokens =
        likesResult?.hits?.map(
          (elm) => (elm as unknown as Like).tokenAddress
        ) ?? [];
      if (likedTokens.length > 0) {
        const filters = likedTokens
          .map((tokenAddress) => `tokenAddress:${tokenAddress}`)
          .join(" OR ");
        const result = await client.searchSingleIndex({
          indexName,
          searchParams: {
            query,
            hitsPerPage,
            page,
            filters: likedTokens.length > 0 ? filters : undefined,
          },
        });
        tokenList = result?.hits ? (result as unknown as TokenList) : undefined;
      }
    } else if (ownedByAddress !== undefined) {
      const result = await client.searchSingleIndex({
        indexName,
        searchParams: {
          query,
          hitsPerPage,
          page,
          facetFilters: [`adminAddress:${ownedByAddress}`],
        },
      });
      tokenList = result?.hits ? (result as unknown as TokenList) : undefined;
    } else {
      const result = await client.searchSingleIndex({
        indexName,
        searchParams: {
          query,
          hitsPerPage,
          page,
        },
      });
      tokenList = result?.hits ? (result as unknown as TokenList) : undefined;
    }

    /*
{
    "hits": DeployedTokenInfo[],
    "nbHits": 2,
    "page": 0,
    "nbPages": 1,
    "hitsPerPage": 100,
    "exhaustiveNbHits": true,
    "exhaustiveTypo": true,
    "exhaustive": {
        "nbHits": true,
        "typo": true
    },
    "query": "",
    "params": "hitsPerPage=100&page=0",
    "renderingContent": {},
    "processingTimeMS": 1,
    "processingTimingsMS": {
        "_request": {
            "roundTrip": 80
        },
        "getIdx": {
            "load": {
                "total": 1
            },
            "total": 1
        },
        "total": 1
    },
    "serverTimeMS": 2
}
    */

    return tokenList;
  } catch (error: any) {
    console.error("algoliaGetToken error:", {
      error: error?.message ?? String(error),
      params,
    });
    return undefined;
  }
}
