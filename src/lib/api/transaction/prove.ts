"use server";

import { proveTransactions } from "@/lib/token-api";
import { debug } from "@/lib/debug";
import { getChain } from "@/lib/chain";
import { checkAddress } from "../utils/address";
import {
  ProveTokenTransactions,
  ProveTokenTransaction,
  JobId,
  TokenTransaction,
} from "@minatokens/api";
import { ApiName, ApiResponse } from "../api-types";
const chain = getChain();
const DEBUG = debug();

export async function prove(props: {
  params: ProveTokenTransactions | ProveTokenTransaction;
  name: ApiName;
  apiKeyAddress: string;
}): Promise<ApiResponse<JobId>> {
  let { name, params: transactions, apiKeyAddress } = props;
  if (!("txs" in transactions)) transactions = { txs: [transactions] };
  const txs: TokenTransaction[] = [];
  for (const params of transactions.txs) {
    const { signedData, tx, sendTransaction = true } = params;
    if (!checkAddress(tx.sender)) {
      return {
        status: 400,
        json: { error: "Invalid sender address" },
      };
    }
    if (signedData === undefined)
      return {
        status: 400,
        json: { error: "Invalid signedData" },
      };
    if (tx === undefined)
      return {
        status: 400,
        json: { error: "Invalid transaction" },
      };
    console.log("Proving token tx", {
      txType: tx.request.txType,
      tokenAddress: tx.request.tokenAddress,
      symbol: tx.symbol,
    });
    console.log("chain", chain);

    if (typeof tx.request.txType !== "string") {
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

    if (!checkAddress(tx.request.tokenAddress)) {
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
      "adminContractAddress" in tx.request
        ? tx.request.adminContractAddress
        : undefined;

    if (tx.request.txType === "token:launch" && !adminContractAddress) {
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
