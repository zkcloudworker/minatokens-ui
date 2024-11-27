"use server";

import { tokenBalance } from "zkcloudworker";
import { checkAddress } from "@/lib/api/address";
import { PublicKey, TokenId } from "o1js";
import { BalanceRequestParams, BalanceResponse, ApiResponse } from "./types";

export async function balance(
  params: BalanceRequestParams,
  apiKeyAddress: string
): Promise<ApiResponse<BalanceResponse>> {
  const { tokenAddress, address } = params;

  if (!address || !checkAddress(address)) {
    return {
      status: 400,
      json: { error: "Invalid address" },
    };
  }

  if (!tokenAddress || !checkAddress(tokenAddress)) {
    return {
      status: 400,
      json: { error: "Invalid token address" },
    };
  }

  try {
    const tokenContractPublicKey = PublicKey.fromBase58(tokenAddress);
    const tokenHolderPublicKey = PublicKey.fromBase58(address);
    const tokenId = TokenId.derive(tokenContractPublicKey);

    const result = await tokenBalance(tokenHolderPublicKey, tokenId);

    return {
      status: 200,
      json: {
        tokenAddress,
        address,
        balance: result ?? null,
      },
    };
  } catch (error) {
    return {
      status: 500,
      json: { error: "Failed to get balance" },
    };
  }
}
