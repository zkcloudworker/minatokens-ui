"use server";
import type { NextApiRequest, NextApiResponse } from "next";
import {
  rateLimit,
  initializeMemoryRateLimiter,
  initializeRedisRateLimiter,
} from "./rate-limit";
import * as readme from "readmeio";
import { jwtVerify } from "jose";
import { Chain, PrismaClient } from "@prisma/client";
import { ApiResponse } from "./api/types";
import { debug } from "./debug";
import { getChain } from "@/lib/chain";
const chain = getChain();
const DEBUG = debug();
const { API_SECRET, MINATOKENS_API_KEY, README_API_KEY } = process.env;

initializeMemoryRateLimiter({
  name: "ipMemory",
  points: 120,
  duration: 60,
});

initializeRedisRateLimiter({
  name: "ipRedis",
  points: 120,
  duration: 60,
});

initializeMemoryRateLimiter({
  name: "apiMemory",
  points: 120,
  duration: 60,
});

initializeRedisRateLimiter({
  name: "apiRedis",
  points: 120,
  duration: 60,
});

function getChainId(): Chain {
  switch (chain) {
    case "mainnet":
      return "mina_mainnet";
    case "devnet":
      return "mina_devnet";
    case "zeko":
      return "zeko_devnet";
    default:
      throw new Error(`Unknown chain: ${chain}`);
  }
}

export function apiHandler<T, V>(params: {
  name: string;
  handler: (params: T) => Promise<ApiResponse<V>>;
  isInternal?: boolean;
}) {
  const { name, handler, isInternal = false } = params;

  return async (req: NextApiRequest & { body: T }, res: NextApiResponse) => {
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "*");
      res.setHeader("Access-Control-Allow-Headers", "*");
      res.status(200).end();
      return;
    }

    if (req.method !== "GET" && req.method !== "POST") {
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(`Method ${req.method} Not Allowed`);
      return;
    }

    const start = Date.now();

    const apiKey = req.headers["x-api-key"];
    if (!apiKey || typeof apiKey !== "string" || apiKey === "") {
      return reply(401, { error: "Unauthorized" });
    }
    let key: string = apiKey;
    const prisma = new PrismaClient({
      datasourceUrl: process.env.POSTGRES_PRISMA_URL,
    });

    async function reply(status: number, json: { error: string } | V) {
      if (!isInternal) {
        await prisma.aPIKeyCalls.create({
          data: {
            address: key,
            status,
            chain: getChainId(),
            endpoint: name,
            error: (json as any)?.error,
          },
        });
      }
      if ((json as any)?.error) {
        console.error("api reply", { status, error: (json as any)?.error });
      }
      res.status(status).json(json);
    }

    try {
      const ip =
        req.headers["x-forwarded-for"]?.toString().split(",").shift() ||
        req.socket.remoteAddress ||
        "0.0.0.0";

      if (await rateLimit({ name: "ipMemory", key: ip })) {
        return await reply(429, { error: "Too many requests" });
      }

      if (isInternal && apiKey !== MINATOKENS_API_KEY) {
        if (!MINATOKENS_API_KEY) {
          console.error("API key not set");
          return await reply(500, { error: "API key not set" });
        }
        return await reply(401, { error: "Unauthorized" });
      }

      let name: string | null = null;
      let email: string | null = null;

      if (!isInternal) {
        try {
          if (!API_SECRET) {
            console.error("API key not set");
            return await reply(500, { error: "API key not set" });
          }
          const secret = new TextEncoder().encode(API_SECRET);
          const jwt = await jwtVerify(apiKey, secret);
          if (DEBUG) console.log("API key verified:", jwt);
          if (
            !jwt?.payload?.address ||
            typeof jwt.payload.address !== "string" ||
            !jwt.payload.name ||
            typeof jwt.payload.name !== "string" ||
            !jwt.payload.email ||
            typeof jwt.payload.email !== "string"
          ) {
            return await reply(401, { error: "Unauthorized" });
          }
          key = jwt.payload.address as string;
          name = jwt.payload.name as string;
          email = jwt.payload.email as string;
        } catch (error) {
          console.error(error);
          return await reply(401, { error: "Unauthorized" });
        }
      }

      if (await rateLimit({ name: "apiMemory", key })) {
        return await reply(429, { error: "Too many requests" });
      }
      if (await rateLimit({ name: "ipRedis", key: ip })) {
        return await reply(429, { error: "Too many requests" });
      }
      if (await rateLimit({ name: "apiRedis", key: apiKey })) {
        return await reply(429, { error: "Too many requests" });
      }

      res.on("finish", async () => {
        if (!README_API_KEY) {
          console.error("README API key not set");
          return;
        }
        if (!isInternal && key && name && email) {
          await readme.log(
            README_API_KEY,
            req,
            res,
            {
              apiKey: key,
              label: name,
              email: email,
            },
            {
              baseLogUrl: "https://minatokens.readme.io",
            }
          );
        }
      });
      const revokedCheck = await prisma.revokedKeys.findUnique({
        where: {
          address: key,
        },
      });
      if (revokedCheck) {
        return await reply(401, { error: "Unauthorized" });
      }

      try {
        const checked = Date.now();
        if (DEBUG)
          console.log("Rate limiting checked in", checked - start, "ms");
        const { status, json } = await handler(req.body);
        const handled = Date.now();
        if (DEBUG) console.log("Handler executed in", handled - checked, "ms");
        return await reply(status, json);
      } catch (error) {
        return await reply(500, { error: "Invalid request body" });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}
