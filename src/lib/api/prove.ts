"use server";

import { proveTransactions } from "@/lib/token-api";
import { debug } from "@/lib/debug";
import { getChain } from "@/lib/chain";
import { checkAddress } from "./address";
import {
  ProveTokenTransactions,
  JobId,
  ApiResponse,
  tokenTransactionTypes,
  DeployTransaction,
  TokenTransaction,
} from "@minatokens/api";
const chain = getChain();
const DEBUG = debug();

export async function prove(
  transactions: ProveTokenTransactions,
  apiKeyAddress: string
): Promise<ApiResponse<JobId>> {
  const txs: (DeployTransaction | TokenTransaction)[] = [];
  for (const params of transactions.txs) {
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
      !tokenTransactionTypes.includes(tx.txType)
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

    if (!tx.proverPayload || typeof tx.proverPayload !== "string") {
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

    if (tx.txType === "launch" && !adminContractAddress) {
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

    tx.signedData = signedData;
    tx.sendTransaction = sendTransaction;

    txs.push(tx);
  }

  const jobId = await proveTransactions(txs);

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
