"use server";
import OpenAI from "openai";
import { RateLimiterRedis } from "rate-limiter-flexible";
import Redis from "ioredis";
import { log as logtail } from "@logtail/next";
import { getChain } from "./chain";
const chain = getChain();
const log = logtail.with({
  service: "ai",
  chain,
});
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let rateLimiter: RateLimiterRedis | null = null;
const RATE_LIMIT_KV_URL = process.env.RATE_LIMIT_KV_URL;
initializeRedisRateLimiterInternal({
  name: "ai",
  points: 10,
  duration: 60 * 60 * 24, // 1 day
});

export async function generateImage(params: {
  symbol: string;
  name: string;
  description?: string;
  address: string;
}): Promise<Blob | undefined> {
  const { symbol, name, description, address } = params;
  if (await rateLimit({ key: address })) {
    log.error("Too many image requests", { ...params, chain });
    return undefined;
  }
  const promptCompletion = await openai.chat.completions.create({
    model: "o1-mini",
    messages: [
      {
        role: "user",
        content:
          `You are an great artist and a creator of tokens on Mina protocol that are very popular and engaging. Create a prompt for DALL-E-3 for generation of an image of a token on Mina protocol with symbol ${symbol}, name ${name}` +
          (description ? `, description: ${description}` : ""),
      },
    ],
    user: address,
  });
  const prompt = promptCompletion?.choices[0]?.message?.content;
  console.log("prompt", prompt);

  if (!prompt) {
    log.error("No prompt generated", { ...params, chain });
    return undefined;
  }

  const completion = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt,
    size: "1024x1024",
    user: address,
  });

  const url = completion.data[0].url;
  if (!url) {
    log.error("No image generated", { ...params, prompt, chain });
    return undefined;
  }
  log.info("Image generated", { ...params, prompt, chain, url });
  const res = await fetch(url, {
    method: "GET",
  });

  if (!res.ok) {
    log.error("Cannot download ai image", { ...params, prompt, chain, url });
    return undefined;
  }

  const blob = await res.blob();
  return blob;
}

function initializeRedisRateLimiterInternal(params: {
  name: string;
  points: number;
  duration: number;
}) {
  const { name, points, duration } = params;
  if (!RATE_LIMIT_KV_URL) {
    throw new Error("RATE_LIMIT_KV_URL not set");
  }

  const redisClient = new Redis(RATE_LIMIT_KV_URL, {
    enableOfflineQueue: true,
    reconnectOnError: function (err) {
      log.error("Redis reconnectOnError:", { name, err });
      return true;
    },
    retryStrategy: function (times) {
      const delay = Math.min(times * 50, 2000);
      log.info(`Redis retry attempt ${times} after ${delay}ms`);
      return delay;
    },
  });

  redisClient.on("error", (error) => {
    log.error("Redis error:", { name, error });
  });

  redisClient.on("connect", () => {
    log.info(`Redis connected for rate limiter: ${name}`);
  });

  rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    points,
    duration,
    keyPrefix: "rate-limit-" + name,
    inMemoryBlockOnConsumed: points + 10,
    inMemoryBlockDuration: 120,
  });
}

export async function rateLimit(params: { key: string }): Promise<boolean> {
  const { key } = params;
  try {
    if (!rateLimiter) {
      log.error(`Rate limiter ${name} not initialized`);
      return false;
    }

    await rateLimiter.consume(key);
    return false;
  } catch (error) {
    log.error("Rate limiter error:", { params, error });
    return true;
  }
}
