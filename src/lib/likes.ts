"use server";
import { PrismaClient, Chain } from "@prisma/client";
import { getPrismaChainName } from "./chain";
import { debug } from "./debug";
import { log as logtail } from "@logtail/next";

const prisma = new PrismaClient();
const chain = getPrismaChainName() as Chain;
const log = logtail.with({
  service: "likes",
  chain,
});
const DEBUG = debug();
const defaultTokenId = "wSHV2S4qX9jFsLjQo8r1BsMLH2ZRKsZx6EJd1sbozGPieEC4Jf";

export interface Like {
  tokenAddress: string;
  userAddress: string;
  tokenId?: string; // or make this required if you always have a tokenId
}

export async function writeLike(params: Like): Promise<boolean> {
  const { tokenAddress, userAddress, tokenId = defaultTokenId } = params;
  try {
    // Check if we've already liked this token
    const existingLike = await prisma.likes.findUnique({
      where: {
        tokenAddress_tokenId_userAddress_chain: {
          tokenAddress,
          tokenId,
          userAddress,
          chain,
        },
      },
    });

    if (!existingLike) {
      // Create a new like
      await prisma.likes.create({
        data: {
          tokenAddress,
          tokenId,
          userAddress,
          chain,
        },
      });
    }

    return true;
  } catch (error) {
    log.error("writeLike: Prisma create error", { error, params });
    return false;
  }
}

export async function getLike(params: Like): Promise<boolean> {
  const { tokenAddress, userAddress, tokenId = defaultTokenId } = params;
  try {
    const existingLike = await prisma.likes.findUnique({
      where: {
        tokenAddress_tokenId_userAddress_chain: {
          tokenAddress,
          tokenId,
          userAddress,
          chain,
        },
      },
    });
    return existingLike !== null;
  } catch (error) {
    log.error("getLike: Prisma lookup error", { error, params });
    return false;
  }
}

export async function likesCount(params: {
  tokenAddress: string;
  tokenId?: string;
}): Promise<number> {
  const { tokenAddress, tokenId = defaultTokenId } = params;
  try {
    const count = await prisma.likes.count({
      where: {
        tokenAddress,
        tokenId,
        chain,
      },
    });
    return count;
  } catch (error) {
    log.error("likesCount: error", {
      error: error instanceof Error ? error.message : String(error),
      params,
    });
    return 0;
  }
}

export async function batchLikesCounts(params: {
  tokens: { address: string; tokenId?: string }[];
}): Promise<number[]> {
  const { tokens } = params;

  try {
    // Normalize or fill missing tokenIds with defaultTokenId
    const items = tokens.map((token) => ({
      tokenAddress: token.address,
      tokenId: token.tokenId ?? defaultTokenId,
    }));

    // Make a single groupBy query for all tokens
    const groupedCounts = await prisma.likes.groupBy({
      by: ["tokenAddress", "tokenId"],
      _count: {
        _all: true,
      },
      where: {
        chain,
        OR: items.map((t) => ({
          tokenAddress: t.tokenAddress,
          tokenId: t.tokenId,
        })),
      },
    });

    // Re-map the grouped results back to the input tokens order
    return items.map((item) => {
      const match = groupedCounts.find(
        (g) =>
          g.tokenAddress === item.tokenAddress && g.tokenId === item.tokenId
      );
      return match?._count._all ?? 0;
    });
  } catch (error) {
    log.error("batchLikesCounts: error", {
      error: error instanceof Error ? error.message : String(error),
      params,
    });
    return tokens.map(() => 0);
  }
}

// export async function batchLikes(params: {
//   tokens: { address: string; tokenId?: string }[];
// }): Promise<number[]> {
//   const { tokens } = params;
//   return Promise.all(
//     tokens.map((token) =>
//       likesCount({
//         tokenAddress: token.address,
//         tokenId: token.tokenId ?? defaultTokenId,
//       })
//     )
//   );
// }

export async function getUsersLikes(params: {
  userAddress: string;
}): Promise<Like[]> {
  const { userAddress } = params;
  try {
    const results = await prisma.likes.findMany({
      where: {
        userAddress,
        chain,
      },
      select: {
        tokenAddress: true,
        tokenId: true,
      },
    });
    return results.map((like) => ({
      tokenAddress: like.tokenAddress,
      tokenId: like.tokenId,
      userAddress,
    }));
  } catch (error) {
    log.error("getUsersLikes: error", {
      error: error instanceof Error ? error.message : String(error),
      params,
    });
    return [];
  }
}
