"use server";
import { prisma } from "@/lib/db";

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
