"use server";
import { Bids, Offers, Prisma, Chain } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getPrismaChainName, getChain } from "./chain";
import { recordActivity } from "./activity";
import { TradeActivityData } from "./activity-types";
import { log as logtail } from "@logtail/next";

const prismaChainName = getPrismaChainName();
const chain = getChain();

const log = logtail.with({
  service: "trade",
});

export interface OfferInfo {
  tokenAddress: string;
  offerAddress: string;
  ownerAddress: string;
  amount: number;
  price: number;
}

export interface BidInfo {
  tokenAddress: string;
  bidAddress: string;
  ownerAddress: string;
  amount: number;
  price: number;
}

export async function writeOffer(params: {
  offerAddress: string;
  tokenAddress: string;
  ownerAddress: string;
  amount: number;
  price: number;
  txHash?: string;
  jobId?: string;
}) {
  const { offerAddress, tokenAddress, ownerAddress, amount, price, txHash, jobId } = params;

  // Check if offer already exists to determine if this is create or update
  const existingOffer = await prisma.offers.findUnique({
    where: {
      offerAddress_tokenAddress_chain: {
        offerAddress,
        tokenAddress,
        chain: prismaChainName,
      },
    },
  });

  const isUpdate = existingOffer !== null;

  const offer = await prisma.offers.upsert({
    where: {
      offerAddress_tokenAddress_chain: {
        offerAddress,
        tokenAddress,
        chain: prismaChainName,
      },
    },
    create: {
      offerAddress,
      tokenAddress,
      ownerAddress,
      chain: prismaChainName,
      amount,
      price,
    },
    update: {
      ownerAddress,
      amount,
      price,
    },
  });

  // Record activity for offer creation or update
  // Only record if we have a txHash (indicating this came from a transaction)
  // This prevents duplicate logging when called from api-transaction.tsx
  if (txHash && !txHash.startsWith("pending-")) {
    const activityData: TradeActivityData = {
      offerAddress,
      tokenSymbol: undefined, // Will be enriched by caller if needed
      isUpdate,
    };

    if (isUpdate && existingOffer) {
      activityData.previousAmount = existingOffer.amount;
      activityData.previousPrice = existingOffer.price;

      // Convert to BigInt for comparison
      const amountBigInt = BigInt(amount);
      const priceBigInt = BigInt(price);

      if (existingOffer.amount !== amountBigInt && existingOffer.price !== priceBigInt) {
        activityData.changeReason = "Amount and price updated";
      } else if (existingOffer.amount !== amountBigInt) {
        activityData.changeReason = "Amount updated";
      } else if (existingOffer.price !== priceBigInt) {
        activityData.changeReason = "Price updated";
      }
    }

    await recordActivity({
      userAddress: ownerAddress,
      txHash: txHash,
      activityType: isUpdate ? "OFFER_UPDATE" : "OFFER_CREATE",
      tokenAddress: tokenAddress,
      chain: prismaChainName,
      activityData: activityData,
      amount: BigInt(amount),
      price: BigInt(price),
      jobId: jobId,
    }).catch((error) => {
      log.error("Failed to record offer activity", {
        error,
        offerAddress,
        isUpdate,
      });
    });
  }

  return offer;
}

export async function getOffers(params: {
  tokenAddress: string;
  ownerAddress?: string;
  maxItems?: number;
}) {
  const { tokenAddress, ownerAddress, maxItems = 5 } = params;
  const offers = await prisma.offers.findMany({
    where: {
      tokenAddress,
      chain: prismaChainName,
      amount: {
        gt: 0,
      },
      ...(ownerAddress !== undefined && { ownerAddress }),
    },
    orderBy: {
      price: "asc",
    },
    take: maxItems,
  });
  return offers;
}

export async function getOffer(params: {
  tokenAddress: string;
  offerAddress: string;
}) {
  const { tokenAddress, offerAddress } = params;
  const offer = await prisma.offers.findUnique({
    where: {
      offerAddress_tokenAddress_chain: {
        offerAddress,
        tokenAddress,
        chain: prismaChainName,
      },
    },
  });
  return offer;
}

export async function writeBid(params: {
  bidAddress: string;
  tokenAddress: string;
  ownerAddress: string;
  amount: number;
  price: number;
  txHash?: string;
  jobId?: string;
}) {
  const { bidAddress, tokenAddress, ownerAddress, amount, price, txHash, jobId } = params;

  // Check if bid already exists to determine if this is create or update
  const existingBid = await prisma.bids.findUnique({
    where: {
      bidAddress_tokenAddress_chain: {
        bidAddress,
        tokenAddress,
        chain: prismaChainName,
      },
    },
  });

  const isUpdate = existingBid !== null;

  const bid = await prisma.bids.upsert({
    where: {
      bidAddress_tokenAddress_chain: {
        bidAddress,
        tokenAddress,
        chain: prismaChainName,
      },
    },
    create: {
      bidAddress,
      tokenAddress,
      ownerAddress,
      chain: prismaChainName,
      amount,
      price,
    },
    update: {
      ownerAddress,
      amount,
      price,
    },
  });

  // Record activity for bid creation or update
  // Only record if we have a txHash (indicating this came from a transaction)
  // This prevents duplicate logging when called from api-transaction.tsx
  if (txHash && !txHash.startsWith("pending-")) {
    const activityData: TradeActivityData = {
      bidAddress,
      tokenSymbol: undefined, // Will be enriched by caller if needed
      isUpdate,
    };

    if (isUpdate && existingBid) {
      activityData.previousAmount = existingBid.amount;
      activityData.previousPrice = existingBid.price;

      // Convert to BigInt for comparison
      const amountBigInt = BigInt(amount);
      const priceBigInt = BigInt(price);

      if (existingBid.amount !== amountBigInt && existingBid.price !== priceBigInt) {
        activityData.changeReason = "Amount and price updated";
      } else if (existingBid.amount !== amountBigInt) {
        activityData.changeReason = "Amount updated";
      } else if (existingBid.price !== priceBigInt) {
        activityData.changeReason = "Price updated";
      }
    }

    await recordActivity({
      userAddress: ownerAddress,
      txHash: txHash,
      activityType: isUpdate ? "BID_UPDATE" : "BID_CREATE",
      tokenAddress: tokenAddress,
      chain: prismaChainName,
      activityData: activityData,
      amount: BigInt(amount),
      price: BigInt(price),
      jobId: jobId,
    }).catch((error) => {
      log.error("Failed to record bid activity", {
        error,
        bidAddress,
        isUpdate,
      });
    });
  }

  return bid;
}

export async function getBids(params: {
  tokenAddress: string;
  ownerAddress?: string;
  maxItems?: number;
}) {
  const { tokenAddress, ownerAddress, maxItems = 5 } = params;
  const bids = await prisma.bids.findMany({
    where: {
      tokenAddress,
      chain: prismaChainName,
      amount: {
        gt: 0,
      },
      ...(ownerAddress !== undefined && { ownerAddress }),
    },
    orderBy: {
      price: "desc",
    },
    take: maxItems,
  });
  return bids;
}

export async function getBid(params: {
  tokenAddress: string;
  bidAddress: string;
}) {
  const { tokenAddress, bidAddress } = params;
  const bid = await prisma.bids.findUnique({
    where: {
      bidAddress_tokenAddress_chain: {
        bidAddress,
        tokenAddress,
        chain: prismaChainName,
      },
    },
  });
  return bid;
}

export async function getOrderbook(params: {
  tokenAddress: string;
  ownerAddress?: string;
  maxItems?: number;
}) {
  const { tokenAddress, ownerAddress, maxItems = 5 } = params;
  const offers = getOffers({ tokenAddress, ownerAddress, maxItems });
  const bids = getBids({ tokenAddress, ownerAddress, maxItems });
  return { offers: await offers, bids: await bids };
}

export async function getTokenBids(
  tokenAddresses: string[]
): Promise<Record<string, Bids | null>> {
  const bids = await prisma.$queryRaw<Bids[]>(Prisma.sql`
    SELECT DISTINCT ON ("tokenAddress")
      *
    FROM "Bids"
    WHERE "tokenAddress" IN (${Prisma.join(tokenAddresses)})
      AND "chain"::text = ${prismaChainName}
    ORDER BY "tokenAddress", "price" DESC
  `);

  const result: Record<string, Bids | null> = {};
  tokenAddresses.forEach((tokenAddress) => {
    result[tokenAddress] =
      bids.find((b) => b.tokenAddress === tokenAddress) || null;
  });

  return result;
}

export async function getTokenOffers(
  tokenAddresses: string[]
): Promise<Record<string, Offers | null>> {
  const offers = await prisma.$queryRaw<Offers[]>(Prisma.sql`
    SELECT DISTINCT ON ("tokenAddress")
      *
    FROM "Offers"
    WHERE "tokenAddress" IN (${Prisma.join(tokenAddresses)})
      AND "chain"::text = ${prismaChainName}
    ORDER BY "tokenAddress", "price" ASC
  `);

  const result: Record<string, Offers | null> = {};
  tokenAddresses.forEach((tokenAddress) => {
    result[tokenAddress] =
      offers.find((o) => o.tokenAddress === tokenAddress) || null;
  });

  return result;
}

export async function getTokenPrices(
  tokenAddresses: string[]
): Promise<Record<string, { bid: Bids | null; offer: Offers | null }>> {
  const [bids, offers] = await Promise.all([
    getTokenBids(tokenAddresses),
    getTokenOffers(tokenAddresses),
  ]);

  const result: Record<string, { bid: Bids | null; offer: Offers | null }> = {};
  tokenAddresses.forEach((tokenAddress) => {
    result[tokenAddress] = {
      bid: bids[tokenAddress],
      offer: offers[tokenAddress],
    };
  });

  return result;
}
