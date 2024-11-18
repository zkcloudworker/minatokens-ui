"use server";
import type { NextApiRequest, NextApiResponse } from "next";
import { checkApiKey } from "@/lib/api";
import { generateApiKey, KeyParams } from "@/lib/api/key";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET" || req.method === "POST") {
    try {
      const { status, json } = await generateApiKey(
        req.body as Record<string, any>
      );
      if (status === 200) {
        console.log("generated api key:", { status, json });
      } else {
        console.error("failed to generate api key:", { status, json });
      }
      res.status(status).json(json);
    } catch (error) {
      console.error("error generating api key:", error);
      res.status(500).json({ error: "Invalid request body" });
    }
  } else {
    // Handle other HTTP methods
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default checkApiKey(handler);
