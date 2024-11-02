"use server";
import type { NextApiRequest, NextApiResponse } from "next";
import { checkApiKey } from "@/lib/api";
import { getTokenStateForApi } from "@/lib/api-token";
import { checkAddress } from "@/lib/address";

/* Usage:

  contractAddress: string; 
  // example: B62qpFzLKkGKMZcmY6wrbyn8Sf9sWUT1HG4omSbvFKH2nXSNjCoQ6Xs
  chain: "devnet" | "mainnet";

devnet:
curl -X POST -H 'x-api-key: API_KEY' \
  -H "Content-Type: application/json" \
  -d '{"tokenAddress":"B62qpFzLKkGKMZcmY6wrbyn8Sf9sWUT1HG4omSbvFKH2nXSNjCoQ6Xs", "chain":"devnet"}' \
  http://minatokens.com/api/token


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

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { tokenAddress, chain } = req.body;
  if (!tokenAddress || !chain) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  if (!checkAddress(tokenAddress)) {
    res.status(400).json({ error: "Invalid token address" });
    return;
  }

  if (chain !== "devnet" && chain !== "mainnet") {
    res.status(400).json({ error: "Invalid chain" });
    return;
  }
  if (req.method === "GET" || req.method === "POST") {
    try {
      const result = await getTokenStateForApi({
        tokenAddress,
        chain,
      });
      if (!result.success) {
        res.status(404).json({ error: result.error });
        return;
      }
      res.status(200).json(result.tokenState);
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
