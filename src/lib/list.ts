"use server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({
  datasourceUrl: process.env.POSTGRES_PRISMA_URL,
});

export async function isWhitelisted(params: {
  address: string;
}): Promise<boolean> {
  const { address } = params;
  const whitelist = await prisma.addressWhitelist.findUnique({
    where: {
      address,
    },
  });
  return whitelist !== null;
}
