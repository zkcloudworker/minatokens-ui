"use server";
import { searchClient } from "@algolia/client-search";
import { DeployedTokenInfo } from "./token";
import { Like, getUsersLikes } from "./likes";
import {
  getAllTokensByAddress,
  BlockberryTokenData,
} from "./blockberry-tokens";
import { getChain, getSiteType } from "./chain";
import { debug } from "./debug";
import { log as logtail } from "@logtail/next";
const chain = getChain();
const siteType = getSiteType();
const log = logtail.with({
  chain,
  service: "search",
});
const DEBUG = debug();

const { ALGOLIA_KEY, ALGOLIA_PROJECT, NFT_ALGOLIA_PROJECT, NFT_ALGOLIA_KEY } =
  process.env;

export interface AlgoliaTokenList {
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

export async function algoliaGetTokenList(params: {
  query?: string;
  hitsPerPage?: number;
  page?: number;
  onlyFavorites: boolean;
  favorites: string[];
  issuedByAddress?: string;
  ownedByAddress?: string;
}): Promise<AlgoliaTokenList | undefined> {
  console.log("algoliaGetTokenList", params);
  const { onlyFavorites, favorites, issuedByAddress, ownedByAddress } = params;
  if (ALGOLIA_KEY === undefined) throw new Error("ALGOLIA_KEY is undefined");
  if (ALGOLIA_PROJECT === undefined)
    throw new Error("ALGOLIA_PROJECT is undefined");
  if (NFT_ALGOLIA_PROJECT === undefined)
    throw new Error("NFT_ALGOLIA_PROJECT is undefined");
  if (NFT_ALGOLIA_KEY === undefined)
    throw new Error("NFT_ALGOLIA_KEY is undefined");
  const query = params.query ?? "";
  const hitsPerPage = params.hitsPerPage ?? 100;
  const page = params.page ?? 0;
  //if (DEBUG) console.log("algoliaGetTokenList", params);
  const client = searchClient(
    siteType === "token" ? ALGOLIA_PROJECT : NFT_ALGOLIA_PROJECT,
    siteType === "token" ? ALGOLIA_KEY : NFT_ALGOLIA_KEY
  );
  const indexName =
    siteType === "token" ? `tokens-${chain}` : `standard-${chain}`;
  //const likesIndexName = `token-likes-${chain}`;

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
    let tokenList: AlgoliaTokenList | undefined = undefined;
    const blockberryTokensPromise = ownedByAddress
      ? getAllTokensByAddress({
          account: ownedByAddress,
        })
      : undefined;

    if (onlyFavorites && issuedByAddress !== undefined) {
      if (favorites.length > 0) {
        const filters = favorites
          .map((tokenAddress) => `tokenAddress:${tokenAddress}`)
          .join(" OR ");

        const result = await client.searchSingleIndex({
          indexName,
          searchParams: {
            query,
            hitsPerPage: 1000,
            page: 0,
            facetFilters: [`adminAddress:${issuedByAddress}`, `status:created`],
            filters,
          },
        });
        tokenList = result?.hits
          ? (result as unknown as AlgoliaTokenList)
          : undefined;
        if (ownedByAddress && tokenList?.hits !== undefined) {
          const blockberryTokenIdsList = await listFromBlockberryTokens(
            blockberryTokensPromise
          );
          tokenList.hits = tokenList.hits.filter((token) =>
            blockberryTokenIdsList.includes(token.tokenId)
          );
        }
      }
    } else if (onlyFavorites) {
      if (favorites.length > 0) {
        const filters = favorites
          .map((tokenAddress) => `tokenAddress:${tokenAddress}`)
          .join(" OR ");
        console.time("favorites");
        const result = await client.searchSingleIndex({
          indexName,
          searchParams: {
            query,
            hitsPerPage: ownedByAddress ? 1000 : hitsPerPage,
            page: ownedByAddress ? 0 : page,
            filters: favorites.length > 0 ? filters : undefined,
            facetFilters: [`status:created`],
          },
        });
        console.timeEnd("favorites");
        tokenList = result?.hits
          ? (result as unknown as AlgoliaTokenList)
          : undefined;
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
          facetFilters: [`adminAddress:${issuedByAddress}`, `status:created`],
        },
      });
      tokenList = result?.hits
        ? (result as unknown as AlgoliaTokenList)
        : undefined;
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
            facetFilters: [`status:created`],
          },
        });
        tokenList = result?.hits
          ? (result as unknown as AlgoliaTokenList)
          : undefined;
      }
    } else {
      console.time("else");
      const result = await client.searchSingleIndex({
        indexName,
        searchParams: {
          query,
          hitsPerPage,
          page,
          facetFilters: [`status:created`],
        },
      });
      console.timeEnd("else");
      tokenList = result?.hits
        ? (result as unknown as AlgoliaTokenList)
        : undefined;
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
    console.log("tokenList", tokenList?.hits?.length);
    return tokenList;
  } catch (error: any) {
    console.log("error", error);
    log.error("algoliaGetToken error:", {
      error: error?.message ?? String(error),
      params,
    });
    return undefined;
  }
}
