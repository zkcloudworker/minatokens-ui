"use server";
import { PrismaClient, Bids, Offers, Prisma } from "@prisma/client";
import { getPrismaChainName } from "./chain";
const prismaChainName = getPrismaChainName();
const prisma = new PrismaClient();

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
}) {
  const { offerAddress, tokenAddress, ownerAddress, amount, price } = params;
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
}) {
  const { bidAddress, tokenAddress, ownerAddress, amount, price } = params;
  const offer = await prisma.bids.upsert({
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
