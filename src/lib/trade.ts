"use server";
import { PrismaClient } from "@prisma/client";
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
  maxItems?: number;
}) {
  const { tokenAddress, maxItems = 5 } = params;
  const offers = await prisma.offers.findMany({
    where: {
      tokenAddress,
      chain: prismaChainName,
      amount: {
        gt: 0,
      },
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
  maxItems?: number;
}) {
  const { tokenAddress, maxItems = 5 } = params;
  const bids = await prisma.bids.findMany({
    where: {
      tokenAddress,
      chain: prismaChainName,
      amount: {
        gt: 0,
      },
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
  maxItems?: number;
}) {
  const { tokenAddress, maxItems = 5 } = params;
  const offers = await getOffers({ tokenAddress, maxItems });
  const bids = await getBids({ tokenAddress, maxItems });
  return { offers, bids };
}
