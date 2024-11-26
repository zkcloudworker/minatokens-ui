"use server";

import { sendDeployTransaction, sendTokenTransaction } from "@/lib/token-api";
import { debug } from "@/lib/debug";
import { getChain } from "@/lib/chain";
import { checkAddress } from "./address";
import {
  ProveTokenTransaction,
  JobId,
  ApiResponse,
  tokenTransactionTypes,
  FungibleTokenTransactionType,
} from "./types";
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
    typeof tx.txType !== "string" ||
    !tokenTransactionTypes.includes(tx.txType as FungibleTokenTransactionType)
  ) {
    return {
      status: 400,
      json: { error: "Invalid transaction type" },
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

    if (!signedDataJson.feePayer) {
      return {
        status: 400,
        json: { error: "Invalid signedData - missing feePayer" },
      };
    }
    if (!signedDataJson.zkappCommand) {
      return {
        status: 400,
        json: { error: "Invalid signedData - missing zkappCommand" },
      };
    }
  } catch (e) {
    return {
      status: 400,
      json: { error: "Invalid signedData" },
    };
  }

  if ("from" in tx && !checkAddress(tx.from)) {
    return {
      status: 400,
      json: { error: "Invalid from address" },
    };
  }
  if (!checkAddress(tx.tokenAddress)) {
    return {
      status: 400,
      json: { error: "Invalid token address" },
    };
  }

  let symbol = tx.symbol;

  // const symbolResponse = await getTokenSymbolAndAdmin({
  //   tokenAddress: tx.tokenAddress,
  // });
  // if (symbolResponse.status !== 200) {
  //   return symbolResponse;
  // }

  // const symbol = symbolResponse.json.tokenSymbol;
  // const adminContractAddress = symbolResponse.json.adminContractAddress;
  const adminContractAddress =
    "adminContractAddress" in tx ? tx.adminContractAddress : undefined;

  if (tx.txType === "deploy" && !adminContractAddress) {
    return {
      status: 400,
      json: { error: "Admin contract address is required" },
    };
  }

  if (adminContractAddress && !checkAddress(adminContractAddress)) {
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
          txType: "deploy",
          serializedTransaction: tx.serializedTransaction,
          signedData,
          adminContractAddress: adminContractAddress!,
          tokenAddress: tx.tokenAddress,
          senderAddress: tx.senderAddress,
          chain,
          symbol,
          uri: tx.uri!,
          sendTransaction,
          developerFee: tx.developerFee,
          developerAddress: tx.developerAddress,
          whitelist: tx.whitelist,
        })
      : await sendTokenTransaction({
          txType: tx.txType,
          serializedTransaction: tx.serializedTransaction,
          signedData,
          tokenAddress: tx.tokenAddress,
          to: tx.to,
          from: tx.from,
          price: tx.price,
          amount: tx.amount,
          chain,
          symbol,
          whitelist: tx.whitelist,
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
