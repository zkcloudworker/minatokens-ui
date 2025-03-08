"use server";
import { PrismaClient } from "@prisma/client";

const LIMIT = 500; // 500 MINA
const prisma = new PrismaClient({
  datasourceUrl: process.env.POSTGRES_PRISMA_URL,
});

export async function checkLimit(params: {
  address: string;
  amount: number;
  price: number;
}): Promise<{ passed: boolean; limit: number }> {
  const { address, amount, price } = params;
  if (amount * price <= LIMIT) return { passed: true, limit: LIMIT };
  const whitelist = await prisma.kYC.findUnique({
    where: {
      address,
    },
  });
  if (!whitelist) return { passed: false, limit: LIMIT };
  if (whitelist.limit >= amount * price)
    return { passed: true, limit: whitelist.limit };
  else return { passed: false, limit: whitelist.limit };
}
