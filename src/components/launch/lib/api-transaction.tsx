"use client";

import { tokenTransaction, airdropTransaction } from "@/lib/api/transaction";
import { proveTransactions } from "@/lib/token-api";
import { UpdateTimelineItemFunction, messages } from "./messages";
import { debug } from "@/lib/debug";
import { TokenAction } from "@/lib/token";
import { log } from "@/lib/log";
import {
  BidTransactionParams,
  OfferTransactionParams,
  TransactionParams,
} from "@minatokens/api";
import { writeBid, writeOffer } from "@/lib/trade";
const DEBUG = debug();

export async function apiTokenTransaction(params: {
  symbol: string;
  updateTimelineItem: UpdateTimelineItemFunction;
  sender: string;
  nonce: number;
  groupId: string;
  action: TokenAction;
  data: TransactionParams;
}): Promise<{
  success: boolean;
  error?: string;
  jobId?: string;
  offerAddress?: string;
  bidAddress?: string;
  to?: string[];
}> {
  if (DEBUG) console.log(`token ${params.action}`, params);
  const { symbol, updateTimelineItem, nonce, groupId, action, data, sender } =
    params;
  const { txType } = data;
  if (txType !== action && txType !== "buy" && txType !== "sell") {
    updateTimelineItem({
      groupId,
      update: {
        lineId: "transactionTypeMismatch",
        content: `Transaction type mismatch. Expected ${action}, got ${txType}`,
        status: "error",
      },
    });
    return {
      success: false,
      error: "Transaction type mismatch",
    };
  }
  try {
    const mina = (window as any).mina;
    if (mina === undefined || mina?.isAuro !== true) {
      updateTimelineItem({
        groupId,
        update: {
          lineId: "noAuroWallet",
          content: `No Auro Wallet found. Please install Auro Wallet and try again.`,
          status: "error",
        },
      });
      return {
        success: false,
        error: "No Auro Wallet found",
      };
    }
    data.sender = sender;
    data.nonce = nonce;
    console.log("building transaction", data);

    const tx =
      txType === "airdrop"
        ? await airdropTransaction(data, sender)
        : await tokenTransaction(data, sender);

    if (tx.status !== 200) {
      updateTimelineItem({
        groupId,
        update: {
          lineId: "txError",
          content: tx.json.error ?? "Error while building transaction",
          status: "error",
        },
      });

      return {
        success: false,
        error: tx.json.error ?? "Error while building transaction",
      };
    }
    const payloads = "txs" in tx.json ? tx.json.txs : [tx.json];

    await sleep(1000);
    updateTimelineItem({
      groupId,
      update: {
        lineId: "txMint",
        content: `${
          action[0].toUpperCase() + action.slice(1)
        } transaction is built`,
        status: "success",
      },
    });

    let i = 0;
    const length = payloads.length;
    for (const payload of payloads) {
      i++;
      const lineId = length > 1 ? ` ${i}` : "";
      updateTimelineItem({
        groupId,
        update: {
          lineId: `txSigned${lineId}`,
          content: `Please sign the transaction${lineId}, setting the nonce to ${payload.nonce} in Auro Wallet advanced settings`,
          status: "waiting",
        },
      });

      const txResult = await mina?.sendTransaction(payload.walletPayload);
      if (DEBUG) console.log("Transaction result", txResult);
      payload.signedData = txResult?.signedData;
      payload.sendTransaction = false;
      if (payload.signedData === undefined) {
        if (DEBUG) console.log("No signed data");
        updateTimelineItem({
          groupId,
          update: {
            lineId: "noUserSignature",
            content: `No user signature received, ${action} transaction cancelled`,
            status: "error",
          },
        });
        log.error("tokenTransaction: No user signature", {
          sender: payload.sender,
        });
        return {
          success: false,
          error: "No user signature",
        };
      }

      updateTimelineItem({
        groupId,
        update: {
          lineId: `txSigned${lineId}`,
          content: `Transaction${lineId} is signed`,
          status: "success",
        },
      });
    }
    updateTimelineItem({
      groupId,
      update: messages.txProved,
    });

    const jobId = await proveTransactions(payloads);

    // const jobId = await proveTransactions([
    //   {
    //     txType: action,
    //     ...payloads,
    //     tokenAddress: contractAddress.toBase58(),
    //     to: to.toBase58(),
    //     from: sender.toBase58(),
    //     price: undefined,
    //     amount: Number(amount.toBigInt()),
    //     symbol,
    //     whitelist,
    //     sendTransaction: false,
    //     developerFee: undefined,
    //     developerAddress: undefined,
    //   },
    // ]);
    // const jobId = await sendTokenTransaction({
    //   txType: action,
    //   tokenAddress: contractAddress.toBase58(),
    //   from: sender.toBase58(),
    //   to: to.toBase58(),
    //   amount: Number(amount.toBigInt()),
    //   chain,
    //   symbol,
    //   sendTransaction: false,
    //   serializedTransaction,
    //   signedData,
    // });

    if (DEBUG) console.log("Sent transaction, jobId", jobId);
    if (jobId === undefined) {
      console.error("JobId is undefined");
      log.error("tokenTransaction: JobId is undefined", { jobId });
      updateTimelineItem({
        groupId,
        update: {
          lineId: "deployTransactionProveJobFailed",
          content: messages.deployTransactionProveJobFailed.content,
          status: "error",
        },
      });
      log.error("tokenTransaction: JobId is undefined", { jobId });

      return {
        success: false,
        error: "JobId is undefined",
      };
    }
    const jobIdMessage = (
      <>
        <a
          href={`https://zkcloudworker.com/job/${jobId}`}
          className="text-accent hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Proving
        </a>{" "}
        the transaction...
      </>
    );

    updateTimelineItem({
      groupId,
      update: {
        lineId: "txProved",
        content: jobIdMessage,
        status: "waiting",
      },
    });
    let offerAddress: string | undefined = undefined;
    let bidAddress: string | undefined = undefined;
    if (action === "offer") {
      const payload = payloads[0].request as OfferTransactionParams;
      const {
        offerAddress: payloadOfferAddress,
        tokenAddress,
        sender,
        amount,
        price,
      } = payload;
      if (
        amount === undefined ||
        price === undefined ||
        payloadOfferAddress === undefined
      ) {
        throw new Error(
          "Amount or price or offerAddress is undefined for offer"
        );
      }
      offerAddress = payloadOfferAddress;
      await writeOffer({
        offerAddress,
        tokenAddress,
        ownerAddress: sender,
        amount,
        price,
      });
    }
    if (action === "bid") {
      const payload = payloads[0].request as BidTransactionParams;
      const {
        bidAddress: payloadBidAddress,
        tokenAddress,
        sender,
        amount,
        price,
      } = payload;
      if (
        amount === undefined ||
        price === undefined ||
        payloadBidAddress === undefined
      ) {
        throw new Error("Amount or price or bidAddress is undefined for bid");
      }
      bidAddress = payloadBidAddress;
      await writeBid({
        bidAddress,
        tokenAddress,
        ownerAddress: sender,
        amount,
        price,
      });
    }

    const to: string[] = [];
    for (const payload of payloads) {
      if ("to" in payload.request && payload.request.to !== undefined)
        to.push(payload.request.to);
    }

    return {
      success: true,
      jobId,
      offerAddress,
      bidAddress,
      to,
    };
  } catch (error) {
    console.error("Error in mintToken", error);
    updateTimelineItem({
      groupId,
      update: {
        lineId: "error",
        content: String(error) ?? `Error while ${action}ing token`,
        status: "error",
      },
    });
    log.error("tokenTransaction: Error while minting token", { error });
    return {
      success: false,
      error: String(error) ?? `Error while ${action}ing token`,
    };
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
