"use server";
import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";
import Redis from "ioredis";

const RATE_LIMIT_KV_URL = process.env.RATE_LIMIT_KV_URL;

const limiters: { [key: string]: RateLimiterMemory | RateLimiterRedis } = {};
const verbose = false;
const printInitMessage = (name: string, type: "memory" | "redis") => {
  if (!verbose) return;
  console.log(`${name} ${type} rate limiter initialized`);
};

export function initializeMemoryRateLimiter(params: {
  name: string;
  points: number;
  duration: number;
}) {
  const { name, points, duration } = params;
  if (limiters[name]) return;
  const rateLimiter = new RateLimiterMemory({
    points,
    duration,
  });

  limiters[name] = rateLimiter;
  printInitMessage(name, "memory");
}

export function initializeRedisRateLimiter(params: {
  name: string;
  points: number;
  duration: number;
}) {
  const { name, points, duration } = params;
  if (limiters[name]) return;
  if (!RATE_LIMIT_KV_URL) {
    throw new Error("RATE_LIMIT_KV_URL not set");
  }

  const redisClient = new Redis(RATE_LIMIT_KV_URL, {
    enableOfflineQueue: true,
    reconnectOnError: function (err) {
      console.error("Redis reconnectOnError:", { name, err });
      return true;
    },
    retryStrategy: function (times) {
      const delay = Math.min(times * 50, 2000);
      if (verbose) console.log(`Redis retry attempt ${times} after ${delay}ms`);
      return delay;
    },
  });

  redisClient.on("error", (error) => {
    console.error("Redis error:", { name, error });
  });

  redisClient.on("connect", () => {
    if (!verbose) return;
    console.log(`Redis connected for rate limiter: ${name}`);
  });

  const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    points,
    duration,
    keyPrefix: "rate-limit-" + name,
    inMemoryBlockOnConsumed: points + 10,
    inMemoryBlockDuration: 120,
  });

  limiters[name] = rateLimiter;
  printInitMessage(name, "redis");
}

const limited: { [key: string]: number } = {};

export async function rateLimit(params: {
  name: string;
  key: string;
}): Promise<boolean> {
  const { name, key } = params;
  try {
    const rateLimiter = limiters[name];
    if (!rateLimiter) {
      console.error(`Rate limiter ${name} not initialized`);
      return false;
    }

    await rateLimiter.consume(key);
    return false;
  } catch (error) {
    if (error instanceof Error) {
      // Store/DB error or timeout error
      console.error("Rate limiter error:", params, error);
      return false;
    } else {
      // RateLimiterRes error - either no points or blocked
      //console.error("Rate limiter error:", params, error);
      const rejRes = error as any;
      if (limited[key] === undefined || limited[key] < Date.now()) {
        limited[key] = Date.now() + 1000 * 60 * 60;
        if (rejRes?.msBeforeNext) {
          console.error(
            `Rate limit blocked for ${name}:${key}, retry after ${rejRes.msBeforeNext}ms`
          );
        } else {
          console.error(
            `Rate limit exceeded for ${name}:${key}, no points remaining`
          );
        }
      }
      return true;
    }
    return true;
  }
}

export async function penalizeRateLimit(params: {
  name: string;
  key: string;
  points: number;
}): Promise<void> {
  const { name, key, points } = params;
  try {
    const rateLimiter = limiters[name];
    if (!rateLimiter) {
      console.error(`Rate limiter ${name} not initialized`);
      return;
    }
    console.error(
      `Penalizing rate limit for ${name} : ${key} (${points} points)`
    );

    await rateLimiter.penalty(key, points);
  } catch (error) {
    console.error("penalizeRateLimit error", params, error);
  }
}
