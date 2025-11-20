"use client";

import {
  tokenTransaction,
  airdropTransaction,
  DeployedTokenTransactionParams,
} from "@/lib/api/token/transaction";
import { proveTransactions } from "@/lib/token-api";
import { UpdateTimelineItemFunction, messages } from "./messages";
import { debug } from "@/lib/debug";
import { TokenAction } from "@/tokens/lib/token";
import { log } from "@/lib/log";
import {
  LaunchTokenAdvancedAdminParams,
  LaunchTokenStandardAdminParams,
  TokenAirdropTransactionParams,
  TokenBidTransactionParams,
  TokenOfferTransactionParams,
  TokenTransactionParams,
  TokenTransactionType,
} from "@silvana-one/api";
import { writeBid, writeOffer } from "@/lib/trade";
import { recordActivity } from "@/lib/activity";
import { ActivityType, Chain } from "@prisma/client";
import { getChain } from "@/lib/chain";
import { ActivityData } from "@/lib/activity-types";
const DEBUG = debug();
const chain = getChain();

// Map transaction types to activity types
const activityTypeMap: Record<string, ActivityType> = {
  "token:mint": "MINT",
  "token:transfer": "TRANSFER",
  "token:burn": "BURN",
  "token:redeem": "REDEEM",
  "token:offer:create": "OFFER_CREATE",
  "token:offer:buy": "OFFER_BUY",
  "token:offer:withdraw": "OFFER_WITHDRAW",
  "token:bid:create": "BID_CREATE",
  "token:bid:sell": "BID_SELL",
  "token:bid:withdraw": "BID_WITHDRAW",
  "token:admin:whitelist": "ADMIN_WHITELIST",
  "token:airdrop": "AIRDROP",
};

export async function apiTokenTransaction(params: {
  symbol: string;
  updateTimelineItem: UpdateTimelineItemFunction;
  sender: string;
  nonce: number;
  groupId: string;
  action: Exclude<TokenTransactionType, "token:launch">;
  data: DeployedTokenTransactionParams | TokenAirdropTransactionParams;
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
  if (
    txType !== action &&
    txType !== "token:offer:buy" &&
    txType !== "token:bid:sell"
  ) {
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
    if (DEBUG) console.log("building transaction", data);

    const tx =
      txType === "token:airdrop"
        ? await airdropTransaction({
            params: data,
            name: "token:airdrop",
            apiKeyAddress: sender,
          })
        : await tokenTransaction({
            params: data as DeployedTokenTransactionParams,
            name: txType,
            apiKeyAddress: sender,
          });

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

    // Record activity for each transaction
    const activityType = activityTypeMap[txType];
    if (activityType && payloads.length > 0) {
      // Special handling for airdrops - record activity for sender AND each recipient
      if (txType === "token:airdrop" && "recipients" in data) {
        const airdropData = data as TokenAirdropTransactionParams;
        const recipients = airdropData.recipients || [];
        const totalAmount = recipients.reduce((sum, r) => sum + (r.amount || 0), 0);

        // Record sender's airdrop activity
        const senderActivityData: any = {
          tokenSymbol: symbol,
          nonce: payloads[0]?.nonce,
          recipients: recipients.map(r => ({
            address: r.address,
            amount: BigInt(r.amount || 0),
            memo: r.memo
          })),
          totalAmount: BigInt(totalAmount),
          recipientCount: recipients.length
        };

        await recordActivity({
          userAddress: sender,
          txHash: `pending-${jobId}-sender`,
          activityType: "AIRDROP",
          tokenAddress: data.tokenAddress,
          chain: chain as Chain,
          activityData: senderActivityData,
          amount: BigInt(totalAmount),
          memo: "memo" in data ? data.memo : `Airdrop to ${recipients.length} recipients`,
          jobId: jobId,
        }).catch((error) => {
          log.error("Failed to record airdrop sender activity", {
            error,
            jobId,
            txType,
          });
        });

        // Record each recipient's activity
        for (let i = 0; i < recipients.length; i++) {
          const recipient = recipients[i];
          const recipientActivityData: any = {
            tokenSymbol: symbol,
            fromAddress: sender,
            recipientAddress: recipient.address,
            airdropBatch: jobId,
            recipientIndex: i
          };

          await recordActivity({
            userAddress: recipient.address,
            txHash: `pending-${jobId}-recipient-${i}`,
            activityType: "TRANSFER",  // Recipients see it as a transfer
            tokenAddress: data.tokenAddress,
            chain: chain as Chain,
            activityData: recipientActivityData,
            amount: recipient.amount ? BigInt(recipient.amount) : undefined,
            memo: recipient.memo || `Airdrop from ${sender}`,
            jobId: jobId,
          }).catch((error) => {
            log.error("Failed to record airdrop recipient activity", {
              error,
              jobId,
              recipient: recipient.address,
              index: i,
            });
          });
        }
      } else {
        // Regular transaction handling
        for (let i = 0; i < payloads.length; i++) {
          const payload = payloads[i];
          // Build activity data based on transaction type
          const activityData: any = {
            tokenSymbol: symbol,
            nonce: payload.nonce,
          };

          // Add type-specific data
          if (txType === "token:mint" || txType === "token:transfer") {
            activityData.recipientAddress = "to" in data ? data.to : undefined;
            if (txType === "token:mint") {
              activityData.minterAddress = sender;
            } else {
              activityData.fromAddress = sender;
              activityData.toAddress = data.to;
            }
          }

          if (txType === "token:offer:create" && "offerAddress" in data) {
            activityData.offerAddress = data.offerAddress;
          }

          if (txType === "token:bid:create" && "bidAddress" in data) {
            activityData.bidAddress = data.bidAddress;
          }

          if (txType === "token:offer:buy" && "offerAddress" in data) {
            activityData.offerAddress = data.offerAddress;
            activityData.buyerAddress = sender;
          }

          if (txType === "token:bid:sell" && "bidAddress" in data) {
            activityData.bidAddress = data.bidAddress;
            activityData.sellerAddress = sender;
          }

          // Use unique pending hash for batch transactions
          const pendingHash = payloads.length > 1
            ? `pending-${jobId}-${i}`
            : `pending-${jobId}`;

          await recordActivity({
            userAddress: sender,
            txHash: pendingHash,
            activityType: activityType,
            tokenAddress: data.tokenAddress,
            chain: chain as Chain,
            activityData: activityData,
            amount: "amount" in data && data.amount ? BigInt(data.amount) : undefined,
            price: "price" in data && data.price ? BigInt(data.price) : undefined,
            memo: "memo" in data ? data.memo : undefined,
            jobId: jobId,
          }).catch((error) => {
            log.error("Failed to record token transaction activity", {
              error,
              jobId,
              txType,
            });
          });
        }
      }
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
    if (action === "token:offer:create") {
      const payload = payloads[0].request as TokenOfferTransactionParams;
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
    if (action === "token:bid:create") {
      const payload = payloads[0].request as TokenBidTransactionParams;
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
  } catch (error: any) {
    console.error("Error in mintToken", error);
    updateTimelineItem({
      groupId,
      update: {
        lineId: "error-api-catch",
        content: error?.message
          ? String(error?.message)
          : `Error while ${action}ing token`,
        status: "error",
      },
    });
    log.error("tokenTransaction: Error while minting token", { error });
    return {
      success: false,
      error: error?.message
        ? String(error?.message)
        : `Error while ${action}ing token`,
    };
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
