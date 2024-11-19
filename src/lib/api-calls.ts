"use server";
import { APIKeyCalls, Chain, PrismaClient } from "@prisma/client";
import { debug } from "./debug";
const DEBUG = debug();

export async function getApiCalls(params: {
  address: string;
  chain: Chain | undefined;
  endpoint: string | undefined;
  timePeriod: number;
  page: number;
  itemsPerPage: number;
}): Promise<{ data: APIKeyCalls[]; totalPages: number }> {
  const { address, chain, endpoint, timePeriod, page, itemsPerPage } = params;
  console.log("getApiCalls", params);
  const prisma = new PrismaClient({
    datasourceUrl: process.env.POSTGRES_PRISMA_URL,
  });

  const totalCount = await prisma.aPIKeyCalls.count({
    where: {
      address,
      chain,
      endpoint,
      time:
        timePeriod > 0
          ? { gte: new Date(Date.now() - timePeriod * 1000) }
          : undefined,
    },
  });

  const apiCalls = await prisma.aPIKeyCalls.findMany({
    where: {
      address,
      chain,
      endpoint,
      time:
        timePeriod > 0
          ? { gte: new Date(Date.now() - timePeriod * 1000) }
          : undefined,
    },
    orderBy: {
      time: "desc",
    },
    skip: (page - 1) * itemsPerPage,
    take: itemsPerPage,
  });
  console.log("getApiCalls", apiCalls);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return {
    data: apiCalls,
    totalPages,
  };
}
