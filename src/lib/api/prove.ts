"use server";

import {
  sendDeployTransaction,
  sendMintTransaction,
  sendTransferTransaction,
} from "@/lib/token-api";
import { debug } from "@/lib/debug";
import { getChain } from "@/lib/chain";
import { checkAddress } from "./address";
import { ProveTokenTransaction, JobId, ApiResponse } from "./types";
import { getTokenSymbolAndAdmin } from "./symbol";
const chain = getChain();
const DEBUG = debug();

export async function proveToken(
  params: ProveTokenTransaction
): Promise<ApiResponse<JobId>> {
  const {
    txType,
    serializedTransaction,
    signedData,
    senderAddress,
    tokenAddress,
    uri,
    sendTransaction,
    to,
    amount,
  } = params;
  if (DEBUG)
    console.log("Proving token tx", {
      txType,
      tokenAddress,
      symbol: params.symbol,
    });
  console.log("chain", chain);

  if (txType !== "deploy" && txType !== "transfer" && txType !== "mint") {
    return {
      status: 400,
      json: { error: "Invalid txType" },
    };
  }

  if (sendTransaction === undefined || typeof sendTransaction !== "boolean") {
    return {
      status: 400,
      json: { error: "Invalid sendTransaction" },
    };
  }

  if (!serializedTransaction || typeof serializedTransaction !== "string") {
    return {
      status: 400,
      json: { error: "Invalid serializedTransaction" },
    };
  }
  if (!signedData || typeof signedData !== "string") {
    return {
      status: 400,
      json: { error: "Invalid signedData" },
    };
  }

  if (!checkAddress(senderAddress)) {
    return {
      status: 400,
      json: { error: "Invalid sender address" },
    };
  }
  if (!checkAddress(tokenAddress)) {
    return {
      status: 400,
      json: { error: "Invalid token address" },
    };
  }
  if (
    params.adminContractAddress &&
    !checkAddress(params.adminContractAddress)
  ) {
    return {
      status: 400,
      json: { error: "Invalid admin contract address" },
    };
  }
  if (to && !checkAddress(to)) {
    return {
      status: 400,
      json: { error: "Invalid to address" },
    };
  }

  if (amount && typeof amount !== "number") {
    return {
      status: 400,
      json: { error: "Invalid amount" },
    };
  }

  if (txType === "deploy" && !uri) {
    return {
      status: 400,
      json: { error: "Invalid uri" },
    };
  }

  if ((txType === "mint" || txType === "transfer") && !to) {
    return {
      status: 400,
      json: { error: "Invalid to address" },
    };
  }

  if ((txType === "mint" || txType === "transfer") && !amount) {
    return {
      status: 400,
      json: { error: "Invalid amount" },
    };
  }

  let adminContractAddress: string | undefined = params.adminContractAddress;
  let symbol: string | undefined = params.symbol;

  if (txType !== "deploy" && (!symbol || !adminContractAddress)) {
    const symbolResponse = await getTokenSymbolAndAdmin({
      tokenAddress,
    });
    if (symbolResponse.status !== 200) {
      return symbolResponse;
    }

    symbol = params.symbol ?? symbolResponse.json.tokenSymbol;
    adminContractAddress =
      adminContractAddress ?? symbolResponse.json.adminContractAddress;
  }
  if (!adminContractAddress || !checkAddress(adminContractAddress)) {
    return {
      status: 400,
      json: { error: "Invalid admin contract address" },
    };
  }

  if (!symbol || typeof params.symbol !== "string") {
    return {
      status: 400,
      json: { error: "Invalid symbol" },
    };
  }

  const jobId =
    txType === "deploy"
      ? await sendDeployTransaction({
          serializedTransaction,
          signedData,
          adminContractPublicKey: adminContractAddress,
          tokenPublicKey: tokenAddress,
          adminPublicKey: senderAddress,
          chain,
          symbol,
          uri: uri!,
          sendTransaction,
        })
      : txType === "mint"
      ? await sendMintTransaction({
          serializedTransaction,
          signedData,
          adminContractPublicKey: adminContractAddress,
          tokenPublicKey: tokenAddress,
          adminPublicKey: senderAddress,
          to: to!,
          amount: amount!,
          chain,
          symbol,
          sendTransaction,
        })
      : await sendTransferTransaction({
          serializedTransaction,
          signedData,
          tokenPublicKey: tokenAddress,
          from: senderAddress,
          to: to!,
          amount: amount!,
          chain,
          symbol,
          sendTransaction,
        });

  if (!jobId) {
    return {
      status: 500,
      json: { error: "Failed to start proving job" },
    };
  }

  return {
    status: 200,
    json: {
      jobId,
    } satisfies JobId,
  };
}
