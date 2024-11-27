"use server";
import { ApiResponse } from "@minatokens/api";
import { PrismaClient } from "@prisma/client";
import { getBlockberryScamInfo } from "../blockberry-tokens";
import { generateJWT } from "./key";

export interface ReadmeParams {
  email: string;
}

export interface ReadmeResponse {
  name: string;
  email: string;
  apiKey: string;
}

export interface KeyResponse {
  sent: boolean;
}

export async function readmeApi(
  params: ReadmeParams
): Promise<ApiResponse<ReadmeResponse>> {
  console.log("readmeApi", params);
  const { email } = params;
  if (!email) {
    return {
      status: 400,
      json: { error: "Email is required" },
    };
  }
  if (!validateEmail(email)) {
    return {
      status: 400,
      json: { error: "Invalid email" },
    };
  }
  try {
    const prisma = new PrismaClient({
      datasourceUrl: process.env.POSTGRES_PRISMA_URL,
    });
    const emailBlacklist = await prisma.emailBlacklist.findUnique({
      where: { email },
    });
    if (emailBlacklist) {
      return {
        status: 400,
        json: { error: "Email is blacklisted" },
      };
    }

    const apiKeys = await prisma.aPIKey.findMany({
      where: { email },
    });
    if (apiKeys.length === 0) {
      return {
        status: 400,
        json: { error: "No API key found" },
      };
    }
    const lastKey = apiKeys.reduce((prev, current) => {
      return prev.createdAt > current.createdAt ? prev : current;
    });

    const { address, name, discord } = lastKey;

    const addressBlacklist = await prisma.addressBlacklist.findUnique({
      where: { address },
    });
    if (addressBlacklist) {
      return {
        status: 400,
        json: { error: "Address is blacklisted" },
      };
    }

    if (discord) {
      const discordBlacklist = await prisma.discordBlacklist.findUnique({
        where: { discord },
      });
      if (discordBlacklist) {
        return {
          status: 400,
          json: { error: "Discord is blacklisted" },
        };
      }
    }
    const blockberryScamInfo = await getBlockberryScamInfo({ address });
    if (blockberryScamInfo && blockberryScamInfo.length > 0) {
      return {
        status: 400,
        json: { error: "Address is a scam" },
      };
    }

    const jwt = await generateJWT({ address, name, email, expiry: "1y" });

    return {
      status: 200,
      json: {
        name,
        email,
        apiKey: jwt,
      },
    };
  } catch (error) {
    console.error(error);
    return {
      status: 500,
      json: { error: "Internal server error" },
    };
  }
}

function validateEmail(email: string): boolean {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}
