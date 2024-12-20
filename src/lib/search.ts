"use server";
import { searchClient } from "@algolia/client-search";
import { DeployedTokenInfo } from "./token";
import { Like } from "./likes";
import {
  getAllTokensByAddress,
  BlockberryTokenData,
} from "./blockberry-tokens";
import { getChain } from "./chain";
import { debug } from "./debug";
import { log as logtail } from "@logtail/next";
const chain = getChain();
const log = logtail.with({
  chain,
  service: "search",
});
const DEBUG = debug();

const { ALGOLIA_KEY, ALGOLIA_PROJECT } = process.env;

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
}

export async function algoliaGetTokenList(
  params: {
    query?: string;
    hitsPerPage?: number;
    page?: number;
    favoritesOfAddress?: string;
    issuedByAddress?: string;
    ownedByAddress?: string;
  } = {}
): Promise<TokenList | undefined> {
  //log.info("algoliaGetTokenList", params);
  const { favoritesOfAddress, issuedByAddress, ownedByAddress } = params;
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

  async function filterFromBlockberryTokens(
    blockberryTokensPromise: Promise<BlockberryTokenData[]> | undefined
  ): Promise<string | undefined> {
    if (blockberryTokensPromise === undefined) return undefined;
    const blockberryTokens = await blockberryTokensPromise;
    if (blockberryTokens.length === 0) return undefined;
    return blockberryTokens
      .map((token) => `tokenId:${token.tokenId}`)
      .join(" OR ");
  }

  async function listFromBlockberryTokens(
    blockberryTokensPromise: Promise<BlockberryTokenData[]> | undefined
  ): Promise<string[]> {
    if (blockberryTokensPromise === undefined) return [];
    const blockberryTokens = await blockberryTokensPromise;
    if (blockberryTokens.length === 0) return [];
    return blockberryTokens.map((token) => token.tokenId);
  }

  try {
    let tokenList: TokenList | undefined = undefined;
    const blockberryTokensPromise = ownedByAddress
      ? getAllTokensByAddress({
          account: ownedByAddress,
        })
      : undefined;

    if (favoritesOfAddress !== undefined && issuedByAddress !== undefined) {
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
            hitsPerPage: 1000,
            page: 0,
            facetFilters: [`adminAddress:${issuedByAddress}`],
            filters,
          },
        });
        tokenList = result?.hits ? (result as unknown as TokenList) : undefined;
        if (ownedByAddress && tokenList?.hits !== undefined) {
          const blockberryTokenIdsList = await listFromBlockberryTokens(
            blockberryTokensPromise
          );
          tokenList.hits = tokenList.hits.filter((token) =>
            blockberryTokenIdsList.includes(token.tokenId)
          );
        }
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
            hitsPerPage: ownedByAddress ? 1000 : hitsPerPage,
            page: ownedByAddress ? 0 : page,
            filters: likedTokens.length > 0 ? filters : undefined,
          },
        });
        tokenList = result?.hits ? (result as unknown as TokenList) : undefined;
        if (ownedByAddress && tokenList?.hits !== undefined) {
          const blockberryTokenIdsList = await listFromBlockberryTokens(
            blockberryTokensPromise
          );
          tokenList.hits = tokenList.hits.filter((token) =>
            blockberryTokenIdsList.includes(token.tokenId)
          );
        }
      }
    } else if (issuedByAddress !== undefined) {
      const result = await client.searchSingleIndex({
        indexName,
        searchParams: {
          query,
          hitsPerPage: ownedByAddress ? 1000 : hitsPerPage,
          page: ownedByAddress ? 0 : page,
          facetFilters: [`adminAddress:${issuedByAddress}`],
        },
      });
      tokenList = result?.hits ? (result as unknown as TokenList) : undefined;
      if (ownedByAddress && tokenList?.hits !== undefined) {
        const blockberryTokenIdsList = await listFromBlockberryTokens(
          blockberryTokensPromise
        );
        tokenList.hits = tokenList.hits.filter((token) =>
          blockberryTokenIdsList.includes(token.tokenId)
        );
      }
    } else if (ownedByAddress !== undefined) {
      const filters = await filterFromBlockberryTokens(blockberryTokensPromise);
      if (filters !== undefined) {
        const result = await client.searchSingleIndex({
          indexName,
          searchParams: {
            query,
            hitsPerPage,
            page,
            filters,
          },
        });
        tokenList = result?.hits ? (result as unknown as TokenList) : undefined;
      }
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
    log.error("algoliaGetToken error:", {
      error: error?.message ?? String(error),
      params,
    });
    return undefined;
  }
}
