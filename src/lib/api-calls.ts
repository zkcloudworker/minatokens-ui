"use server";
import { APIKeyCalls, Chain, PrismaClient } from "@prisma/client";
import { debug } from "./debug";
const DEBUG = debug();

export async function getApiCalls(params: {
  address: string;
  chain: Chain | undefined;
  endpoint: string | undefined;
  timePeriod: number; // in seconds, 0 for all time
}): Promise<APIKeyCalls[]> {
  const { address, chain, endpoint, timePeriod } = params;
  console.log("getApiCalls", params);
  const prisma = new PrismaClient({
    datasourceUrl: process.env.POSTGRES_PRISMA_URL,
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
  });
  console.log("getApiCalls", apiCalls);
  return apiCalls;
}
