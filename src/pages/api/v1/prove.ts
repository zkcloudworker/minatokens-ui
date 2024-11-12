"use server";
import type { NextApiRequest, NextApiResponse } from "next";
import { checkApiKey } from "@/lib/api";
import { proveToken } from "@/lib/api/prove";
import { ProveTokenTransaction } from "@/lib/api/types";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET" || req.method === "POST") {
    try {
      const { status, json } = await proveToken(
        req.body as ProveTokenTransaction
      );
      res.status(status).json(json);
    } catch (error) {
      res.status(500).json({ error: "Invalid request body" });
    }
  } else {
    // Handle other HTTP methods
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default checkApiKey(handler);
