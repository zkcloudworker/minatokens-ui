"use server";
import type { NextApiRequest, NextApiResponse } from "next";
import {
  rateLimit,
  initializeMemoryRateLimiter,
  initializeRedisRateLimiter,
} from "./rate-limit";
const MINATOKENS_API_KEY = process.env.MINATOKENS_API_KEY;

type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

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

export function checkApiKey(handler: ApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "*");
      res.setHeader("Access-Control-Allow-Headers", "*");
      res.status(200).end();
      return;
    }
    const ip =
      req.headers["x-forwarded-for"]?.toString().split(",").shift() ||
      req.socket.remoteAddress ||
      "0.0.0.0";
    if (await rateLimit({ name: "ipMemory", key: ip })) {
      return res.status(429).json({ error: "Too many requests" });
    }

    if (!MINATOKENS_API_KEY) {
      console.error("API key not set");
      return res.status(500).json({ error: "API key not set" });
    }

    const apiKey = req.headers["x-api-key"];

    if (!apiKey || apiKey !== process.env.MINATOKENS_API_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (await rateLimit({ name: "apiMemory", key: apiKey })) {
      return res.status(429).json({ error: "Too many requests" });
    }
    if (await rateLimit({ name: "ipRedis", key: ip })) {
      return res.status(429).json({ error: "Too many requests" });
    }
    if (await rateLimit({ name: "apiRedis", key: apiKey })) {
      return res.status(429).json({ error: "Too many requests" });
    }

    // Proceed to the handler if the API key is valid
    return handler(req, res);
  };
}
