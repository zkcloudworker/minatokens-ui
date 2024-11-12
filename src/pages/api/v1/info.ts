"use server";
import type { NextApiRequest, NextApiResponse } from "next";
import { checkApiKey } from "@/lib/api";
import { getTokenStateForApi } from "@/lib/api/token-info";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET" || req.method === "POST") {
    try {
      const { status, json } = await getTokenStateForApi(
        req.body as {
          tokenAddress: string;
        }
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

/* Usage:

  contractAddress: string; 
  // example: B62qpFzLKkGKMZcmY6wrbyn8Sf9sWUT1HG4omSbvFKH2nXSNjCoQ6Xs

devnet:
curl -X POST -H 'x-api-key: API_KEY' \
  -H "Content-Type: application/json" \
  -d '{"tokenAddress":"B62qpFzLKkGKMZcmY6wrbyn8Sf9sWUT1HG4omSbvFKH2nXSNjCoQ6Xs"}' \
  https://minatokens.com/api/v1/token


  reply example:
{
  tokenAddress: "B62qpFzLKkGKMZcmY6wrbyn8Sf9sWUT1HG4omSbvFKH2nXSNjCoQ6Xs",
  tokenId: "weDBAqEmqEHE9TXay9DryEMaNs8ts7Qt4X5Rupnxmh8o6wBgwS",
  adminContractAddress:
    "B62qjpFSUnwHsYX1KuEfDHjPyg6AuWotyfRApGgpoj6bybvjjAriKHe",
  adminAddress: "B62qo69VLUPMXEC6AFWRgjdTEGsA3xKvqeU5CgYm3jAbBJL7dTvaQkv",
  adminTokenBalance: 0,
  totalSupply: 15000,
  isPaused: false,
  decimals: 9,
  tokenSymbol: "POKRPC",
  verificationKeyHash:
    "25084457276132306637089336910977939820654927814172888515895248592725736067489",
  uri: "https://arweave.net/vPYTrGj3tt4CiyN311nnBCQvr_FE927uxfFg5VyxCLU",
  version: 0,
  adminTokenSymbol: "",
  adminUri: "https://arweave.net/vPYTrGj3tt4CiyN311nnBCQvr_FE927uxfFg5VyxCLU",
  adminVerificationKeyHash:
    "1200635497217107248831982322269320244173535715339356861513501242012238077174",
  adminVersion: 0,
};
*/
