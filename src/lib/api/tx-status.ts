"use server";
import { checkZkappTransaction } from "o1js";
import { initBlockchain } from "@/lib/blockchain";
import {
  ApiResponse,
  TransactionStatus,
  TransactionStatusParams,
  TxStatus,
} from "./types";
import { getChain } from "@/lib/chain";
const chain = getChain();
const BLOCKBERRY_API = process.env.BLOCKBERRY_API;

export async function getTransactionStatus(
  params: TransactionStatusParams,
  apiKeyAddress: string
): Promise<ApiResponse<TransactionStatus>> {
  console.log("getTransactionStatus", params);
  const { hash } = params;
  try {
    if (!hash || typeof hash !== "string" || hash.length === 0) {
      return {
        status: 400,
        json: { error: "Invalid hash" },
      };
    }
    if (chain === "zeko") {
      return {
        status: 200,
        json: { hash, status: "applied" },
      };
    }

    if (!BLOCKBERRY_API) {
      console.error("BLOCKBERRY_API is undefined");
      return {
        status: 500,
        json: { error: "BLOCKBERRY_API is undefined" },
      };
    }
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-api-key": BLOCKBERRY_API,
      },
    };
    try {
      const response = await fetch(
        `https://api.blockberry.one/mina-${chain}/v1/zkapps/txs/${hash}`,
        options
      );
      if (response.ok) {
        const result = (await response.json()) as TxStatus;
        //console.log("blockberry result", result);
        const status = result.txStatus;
        if (
          status !== "pending" &&
          status !== "applied" &&
          status !== "failed"
        ) {
          console.error(
            "getTransactionStatus error while getting tx status - invalid status",
            {
              hash,
              status,
              result,
            }
          );
        }
        if (status) {
          return {
            status: 200,
            json: {
              hash,
              status: status as unknown as
                | "pending"
                | "applied"
                | "failed"
                | "unknown",
              details: result,
            },
          };
        }
      }
      // console.log("blockberry error", {
      //   status: response.status,
      //   text: response.statusText,
      //   json: await response.json(),
      // });
    } catch (error: any) {
      //console.error("blockberry catch", error);
    }

    await initBlockchain();
    try {
      const txStatus = await checkZkappTransaction(hash);
      if (txStatus?.success === true) {
        return {
          status: 200,
          json: {
            hash,
            status: "applied",
          },
        };
      } else if (txStatus.failureReason) {
        return {
          status: 200,
          json: {
            hash,
            status: "failed",
            error: JSON.stringify({ failureReason: txStatus.failureReason }),
          },
        };
      }
    } catch (error: any) {}

    return {
      status: 200,
      json: {
        hash,
        status: "unknown",
      },
    };
  } catch (error: any) {
    console.error("getTransactionStatus catch", error);
    return {
      status: 500,
      json: {
        error: error?.message ?? (error ? String(error) : "unknown error"),
      },
    };
  }
}
