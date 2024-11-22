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
  params: ProveTokenTransaction,
  apiKeyAddress: string
): Promise<ApiResponse<JobId>> {
  const { signedData, tx, sendTransaction = true } = params;
  if (DEBUG)
    console.log("Proving token tx", {
      txType: tx.txType,
      tokenAddress: tx.tokenAddress,
      symbol: tx.symbol,
    });
  console.log("chain", chain);

  if (
    tx.txType !== "deploy" &&
    tx.txType !== "transfer" &&
    tx.txType !== "mint"
  ) {
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

  if (
    !tx.serializedTransaction ||
    typeof tx.serializedTransaction !== "string"
  ) {
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

  try {
    const signedDataJson = JSON.parse(signedData);
    console.log("signedDataJson", signedDataJson);
  } catch (e) {
    return {
      status: 400,
      json: { error: "Invalid signedData" },
    };
  }

  if (!checkAddress(tx.senderAddress)) {
    return {
      status: 400,
      json: { error: "Invalid sender address" },
    };
  }
  if (!checkAddress(tx.tokenAddress)) {
    return {
      status: 400,
      json: { error: "Invalid token address" },
    };
  }
  if (tx.adminContractAddress && !checkAddress(tx.adminContractAddress)) {
    return {
      status: 400,
      json: { error: "Invalid admin contract address" },
    };
  }

  let symbol = tx.symbol;
  let adminContractAddress = tx.adminContractAddress;

  // const symbolResponse = await getTokenSymbolAndAdmin({
  //   tokenAddress: tx.tokenAddress,
  // });
  // if (symbolResponse.status !== 200) {
  //   return symbolResponse;
  // }

  // const symbol = symbolResponse.json.tokenSymbol;
  // const adminContractAddress = symbolResponse.json.adminContractAddress;

  if (!adminContractAddress || !checkAddress(adminContractAddress)) {
    return {
      status: 400,
      json: { error: "Invalid admin contract address" },
    };
  }

  if (!symbol || typeof symbol !== "string") {
    return {
      status: 400,
      json: { error: "Invalid symbol" },
    };
  }

  const jobId =
    tx.txType === "deploy"
      ? await sendDeployTransaction({
          serializedTransaction: tx.serializedTransaction,
          signedData,
          adminContractPublicKey: adminContractAddress,
          tokenPublicKey: tx.tokenAddress,
          adminPublicKey: tx.senderAddress,
          chain,
          symbol,
          uri: tx.uri!,
          sendTransaction,
          developerFee: tx.developerFee,
          developerAddress: tx.developerAddress,
        })
      : tx.txType === "mint"
      ? await sendMintTransaction({
          serializedTransaction: tx.serializedTransaction,
          signedData,
          adminContractPublicKey: adminContractAddress,
          tokenPublicKey: tx.tokenAddress,
          adminPublicKey: tx.senderAddress,
          to: tx.to,
          amount: tx.amount,
          chain,
          symbol,
          sendTransaction,
          developerFee: tx.developerFee,
          developerAddress: tx.developerAddress,
        })
      : await sendTransferTransaction({
          serializedTransaction: tx.serializedTransaction,
          signedData,
          tokenPublicKey: tx.tokenAddress,
          from: tx.senderAddress,
          to: tx.to,
          amount: tx.amount,
          chain,
          symbol,
          sendTransaction,
          developerFee: tx.developerFee,
          developerAddress: tx.developerAddress,
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
