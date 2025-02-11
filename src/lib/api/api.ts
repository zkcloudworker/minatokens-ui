"use server";
import type { NextApiRequest, NextApiResponse } from "next";
import { withLogtail, LogtailAPIRequest } from "@logtail/next";
import {
  rateLimit,
  initializeMemoryRateLimiter,
  initializeRedisRateLimiter,
} from "../rate-limit";
import { jwtVerify } from "jose";
import { Chain, PrismaClient } from "@prisma/client";
import {
  TokenTransaction,
  FaucetResponse,
  TokenState,
  JobId,
  JobResult,
  TransactionStatus,
  BalanceResponse,
  TokenTransactionType,
  JobResults,
} from "@minatokens/api";
import { ApiResponse, ApiName } from "./api-types";
import { debug } from "../debug";
import { getChain } from "@/lib/chain";
const chain = getChain();
const DEBUG = debug();
const { API_SECRET, MINATOKENS_API_KEY, README_API_KEY, README_DOCS_SECRET } =
  process.env;

const prisma = new PrismaClient({
  datasourceUrl: process.env.POSTGRES_PRISMA_URL,
});

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

initializeRedisRateLimiter({
  name: "base64",
  points: 20,
  duration: 60 * 60 * 24, // 1 day
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
  name: ApiName;
  handler: (props: {
    params: T;
    name: ApiName;
    apiKeyAddress: string;
  }) => Promise<ApiResponse<V>>;
  isInternal?: boolean;
  isReadme?: boolean;
}) {
  return withLogtail(apiHandlerInternal(params));
}

function apiHandlerInternal<T, V>(params: {
  name: ApiName;
  handler: (props: {
    params: T;
    name: ApiName;
    apiKeyAddress: string;
  }) => Promise<ApiResponse<V>>;
  isInternal?: boolean;
  isReadme?: boolean;
}) {
  const { name, handler, isInternal = false, isReadme = false } = params;

  return async (req: LogtailAPIRequest & { body: T }, res: NextApiResponse) => {
    req.log.info("apiHandler", { name });
    const start = Date.now();
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

    const ip =
      req.headers["x-forwarded-for"]?.toString().split(",").shift() ||
      req.socket.remoteAddress ||
      "0.0.0.0";

    if (await rateLimit({ name: "ipMemory", key: ip })) {
      return await reply(429, { error: "Too many requests" });
    }

    // if (isReadme) {
    //   const signature = req.headers["readme-signature"];
    //   if (!signature || typeof signature !== "string") {
    //     return reply(401, { error: "Unauthorized" });
    //   }

    //   const email = req.body.email;
    //   if (!email || typeof email !== "string") {
    //     return reply(400, { error: "Email is required" });
    //   }
    //   if (await rateLimit({ name: "apiMemory", key: "readme" })) {
    //     return await reply(429, { error: "Too many requests" });
    //   }
    //   if (!README_DOCS_SECRET) {
    //     console.error("Readme Docs API secret not set");
    //     return res
    //       .status(500)
    //       .json({ error: "Readme Docs API secret not set" });
    //   }
    //   try {
    //     readme.verifyWebhook(req.body, signature, README_DOCS_SECRET);
    //   } catch (e: any) {
    //     // Handle invalid requests
    //     req.log.error("webhook verification failed", e);
    //     return res.status(401).json({ error: e?.message || "Unauthorized" });
    //   }
    //   const { status, json } = await readmeApi({ email });
    //   return res.status(status).json(json);
    // }

    const apiKey = req.headers["x-api-key"];
    if (!apiKey || typeof apiKey !== "string" || apiKey === "") {
      return reply(401, { error: "Unauthorized" });
    }
    let userKey: string = apiKey;
    let userName: string | null = null;
    let userEmail: string | null = null;

    function getResult(json: any): string | undefined {
      const result = {
        txType: (json as any)?.txType,
        tokenAddress: (json as any)?.tokenAddress,
        adminContractAddress: (json as any)?.adminContractAddress,
        symbol: (json as any)?.symbol,
        tokenSymbol: (json as any)?.tokenSymbol,
        memo: (json as any)?.memo,
        hash: (json as any)?.hash,
        status: (json as any)?.status,
        jobId: (json as any)?.jobId,
        jobStatus: (json as any)?.jobStatus,
        balance: (json as any)?.balance,
      };
      const filtered = Object.fromEntries(
        Object.entries(result).filter(([, value]) => value !== undefined)
      );
      console.log("getResult", name, filtered);

      switch (name) {
        case "transaction:proof":
          const jobResults = json as JobResults;
          if (
            jobResults.success &&
            jobResults.results &&
            jobResults.results.length > 0
          )
            return jobResults.results[0].hash;
          if (jobResults.jobStatus) return jobResults.jobStatus;
          if (jobResults.success) return jobResults.success.toString();
          return "error";
        case "transaction:status":
          return (json as TransactionStatus)?.status;
        case "faucet":
          return (json as FaucetResponse)?.hash;
        case "transaction:prove":
          return (json as JobId)?.jobId;
        case "token:launch":
          return (json as TokenTransaction)?.memo;
        case "info:token":
          return (json as TokenState)?.tokenSymbol;
        case "info:balance":
          return (json as BalanceResponse)?.balance?.toString();
        default:
          return (json as TokenTransaction)?.memo;
      }
    }

    async function reply(status: number, json: { error: string } | V) {
      if (status !== 200) req.log.error("api reply", { status, json });
      if (!isInternal) {
        // if (!README_API_KEY) {
        //   req.log.error("README API key not set");
        // } else if (userKey && userName && userEmail) {
        //   const log = await readme.log(
        //     README_API_KEY,
        //     req,
        //     res,
        //     {
        //       apiKey: userKey,
        //       label: userName,
        //       email: userEmail,
        //     },
        //     {
        //       baseLogUrl: "https://docs.minatokens.com",
        //     }
        //   );

        //   if (DEBUG) console.log("README log", log);
        // } else {
        //   req.log.error("No user info found for API key", { userKey });
        //   console.error("No user info found for API key", userKey);
        // }
        if ((json as any)?.error) {
          if (status === 200)
            req.log.error("api reply", { status, error: (json as any)?.error });
          console.error("api reply", { status, error: (json as any)?.error });
        }
        const end = Date.now();
        await prisma.aPIKeyCalls.create({
          data: {
            address: userKey,
            status,
            chain: getChainId(),
            endpoint: name,
            error: (json as any)?.error,
            result: getResult(json),
            responseTimeMs: end - start,
          },
        });
      }
      res.status(status).json(json);
    }

    try {
      if (isInternal && apiKey !== MINATOKENS_API_KEY) {
        if (!MINATOKENS_API_KEY) {
          console.error("API key not set");
          return await reply(500, { error: "API key not set" });
        }
        return await reply(401, { error: "Unauthorized" });
      }

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
            return res.status(401).json({ error: "Unauthorized" });
          }
          userKey = jwt.payload.address as string;
          userName = jwt.payload.name as string;
          userEmail = jwt.payload.email as string;
        } catch (error: any) {
          req.log.error("API key verification failed", { error });
          return res
            .status(401)
            .json({ error: error?.message ?? "Unauthorized" });
        }
      }

      if (await rateLimit({ name: "apiMemory", key: userKey })) {
        return await reply(429, { error: "Too many requests" });
      }
      if (await rateLimit({ name: "ipRedis", key: ip })) {
        return await reply(429, { error: "Too many requests" });
      }
      if (await rateLimit({ name: "apiRedis", key: userKey })) {
        return await reply(429, { error: "Too many requests" });
      }
      if (name === "token:launch" && req.body.uri?.imageBase64) {
        if (typeof req.body.uri?.imageBase64 !== "string") {
          req.log.error("Invalid image, should be base64 string", {
            imageBase64: req.body.uri?.imageBase64,
          });
          return await reply(400, {
            error: "Invalid image, should be base64 string",
          });
        }
        if (req.body.uri.imageBase64.length > 2000000) {
          req.log.error("Image too large", {
            imageLength: req.body.uri.imageBase64.length,
          });
          return await reply(400, {
            error: "Image too large, the maximum size is 1MB",
          });
        }
        if (await rateLimit({ name: "apiRedis", key: userKey })) {
          console.error("Too many launch with image requests", userKey);
          req.log.error("Too many launch with image requests", { userKey });
          return await reply(429, {
            error: "Too many launch with image requests",
          });
        }
      }

      if (!isInternal) {
        const revokedCheck = await prisma.revokedKeys.findUnique({
          where: {
            address: userKey,
          },
        });
        if (revokedCheck) {
          return await reply(401, { error: "Unauthorized" });
        }
      }

      try {
        const checked = Date.now();
        if (DEBUG)
          console.log("Rate limiting checked in", checked - start, "ms");
        const { status, json } = await handler({
          params: req.body,
          name,
          apiKeyAddress: userKey,
        });
        const handled = Date.now();
        if (DEBUG) console.log("Handler executed in", handled - checked, "ms");
        return await reply(status, json);
      } catch (error) {
        req.log.error("apiHandler error", { error });
        console.error("apiHandler error", error);
        return await reply(500, { error: "Invalid request body" });
      }
    } catch (error) {
      req.log.error("apiHandler error", { error });
      console.error("apiHandler error", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}
