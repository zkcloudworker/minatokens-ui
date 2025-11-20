"use server";

import { proveTransactions as proveTokenTransactions } from "@/lib/token-api";
import { proveTransactions as proveNftTransactions } from "@/lib/nft-api";
import { debug } from "@/lib/debug";
import { getChain } from "@/lib/chain";
import { checkAddress } from "../utils/address";
import { checkAddress as checkSenderAddress } from "@/lib/address";
import {
  ProveTokenTransactions,
  ProveTokenTransaction,
  ProveNftTransactions,
  ProveNftTransaction,
  JobId,
  TokenTransaction,
  NftTransaction,
} from "@silvana-one/api";
import { ApiName, ApiResponse } from "../api-types";
import { recordActivity } from "@/lib/activity";
import { Chain } from "@prisma/client";
import {
  NFTLaunchActivityData,
  NFTMintActivityData,
  NFTTransferActivityData,
  NFTApproveActivityData,
  NFTTradeActivityData,
} from "@/lib/activity-types";
const chain = getChain();
import { log as logtail } from "@logtail/next";
const log = logtail.with({
  service: "transaction",
  chain,
});
const DEBUG = debug();

export async function prove(props: {
  params:
    | ProveTokenTransactions
    | ProveTokenTransaction
    | ProveNftTransactions
    | ProveNftTransaction;
  name: ApiName;
  apiKeyAddress: string;
}): Promise<ApiResponse<JobId>> {
  let { name, params: transactions, apiKeyAddress } = props;
  try {
    const proveTransactions =
      "txs" in transactions ? transactions : { txs: [transactions] };
    const txs: TokenTransaction[] | NftTransaction[] = [];
    for (const params of proveTransactions.txs) {
      const { signedData, tx } = params;
      const sendTransaction = tx.sendTransaction ?? true;

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
      console.log(`Proving ${tx.request.txType} tx`, {
        txType: tx.request.txType,
        tokenAddress:
          "tokenAddress" in tx.request ? tx.request.tokenAddress : undefined,
        collectionAddress:
          "collectionAddress" in tx.request
            ? tx.request.collectionAddress
            : undefined,
        collectionName:
          "collectionName" in tx.request
            ? tx.request.collectionName
            : undefined,
        symbol: tx.symbol,
      });
      console.log("chain", chain);

      if (typeof tx.request.txType !== "string") {
        return {
          status: 400,
          json: { error: "Invalid transaction type" },
        };
      }

      if (
        sendTransaction === undefined ||
        typeof sendTransaction !== "boolean"
      ) {
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

      if (
        "tokenAddress" in tx.request &&
        !checkAddress(tx.request.tokenAddress)
      ) {
        return {
          status: 400,
          json: { error: "Invalid token address" },
        };
      }

      if (
        "collectionAddress" in tx.request &&
        !checkAddress(tx.request.collectionAddress)
      ) {
        return {
          status: 400,
          json: { error: "Invalid collection address" },
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

      if (
        (tx.request.txType === "token:launch" ||
          tx.request.txType === "nft:launch") &&
        !adminContractAddress
      ) {
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

      if (!(await checkSenderAddress(tx.sender))) {
        console.error("Invalid sender address ERR7562", tx.sender);
        return {
          status: 400,
          json: { error: "Invalid sender address: ERR7562" },
        };
      }

      // remove private keys from request if they are present
      if ("collectionContractPrivateKey" in tx.request)
        tx.request.collectionContractPrivateKey = undefined;
      if ("tokenContractPrivateKey" in tx.request)
        tx.request.tokenContractPrivateKey = undefined;
      if ("adminContractPrivateKey" in tx.request)
        tx.request.adminContractPrivateKey = undefined;
      if ("privateMetadata" in tx.request)
        tx.request.privateMetadata = undefined;

      txs.push(tx as any);
    }

    const isNFT = txs[0].request.txType.startsWith("nft:");

    const jobId = isNFT
      ? await proveNftTransactions(txs as NftTransaction[])
      : await proveTokenTransactions(txs as TokenTransaction[]);

    if (!jobId) {
      return {
        status: 500,
        json: { error: "Failed to start proving job" },
      };
    }

    // Record NFT activities after jobId is obtained
    if (isNFT) {
      for (let i = 0; i < txs.length; i++) {
        const tx = txs[i] as NftTransaction;
        const txType = tx.request.txType;
        const sender = tx.sender;

        // Use unique pending hash for batch transactions
        const pendingHash = txs.length > 1
          ? `pending-${jobId}-${i}`
          : `pending-${jobId}`;

        try {
          if (txType === "nft:launch") {
            const request = tx.request as any;
            const activityData: NFTLaunchActivityData = {
              collectionAddress: request.collectionAddress,
              collectionName: request.collectionName,
              collectionSymbol: tx.symbol,
              adminContractAddress: request.adminContractAddress,
              metadataVerificationKeyHash: tx.metadataRoot?.toString(),
            };

            await recordActivity({
              userAddress: sender,
              txHash: pendingHash,
              activityType: "NFT_LAUNCH",
              tokenAddress: request.collectionAddress,
              chain: chain as Chain,
              activityData: activityData,
              memo: request.memo,
              jobId: jobId,
            });
          } else if (txType === "nft:mint") {
            const request = tx.request as any;
            const activityData: NFTMintActivityData = {
              collectionAddress: request.collectionAddress,
              nftId: request.nftId || request.address,
              recipientAddress: request.to || sender,
              metadata: request.metadata,
              uri: request.uri,
              tokenSymbol: tx.symbol,
            };

            await recordActivity({
              userAddress: sender,
              txHash: pendingHash,
              activityType: "NFT_MINT",
              tokenAddress: request.collectionAddress,
              chain: chain as Chain,
              activityData: activityData,
              memo: request.memo,
              jobId: jobId,
            });
          } else if (txType === "nft:transfer") {
            const request = tx.request as any;
            const activityData: NFTTransferActivityData = {
              collectionAddress: request.collectionAddress,
              nftId: request.nftId || request.address,
              fromAddress: sender,
              toAddress: request.to,
              tokenSymbol: tx.symbol,
            };

            await recordActivity({
              userAddress: sender,
              txHash: pendingHash,
              activityType: "NFT_TRANSFER",
              tokenAddress: request.collectionAddress,
              chain: chain as Chain,
              activityData: activityData,
              memo: request.memo,
              jobId: jobId,
            });
          } else if (txType === "nft:approve") {
            const request = tx.request as any;
            const activityData: NFTApproveActivityData = {
              collectionAddress: request.collectionAddress,
              nftId: request.nftId || request.address,
              approvedAddress: request.to || request.approved,
              ownerAddress: sender,
              tokenSymbol: tx.symbol,
            };

            await recordActivity({
              userAddress: sender,
              txHash: pendingHash,
              activityType: "NFT_APPROVE",
              tokenAddress: request.collectionAddress,
              chain: chain as Chain,
              activityData: activityData,
              memo: request.memo,
              jobId: jobId,
            });
          } else if (txType === "nft:buy" || txType === "nft:sell") {
            const request = tx.request as any;
            const activityData: NFTTradeActivityData = {
              collectionAddress: request.collectionAddress,
              nftId: request.nftId || request.address,
              sellerAddress: txType === "nft:sell" ? sender : request.seller || request.from,
              buyerAddress: txType === "nft:buy" ? sender : request.buyer || request.to,
              salePrice: BigInt(request.price || request.nftSellParams?.price || 0),
              tokenSymbol: tx.symbol,
            };

            await recordActivity({
              userAddress: sender,
              txHash: pendingHash,
              activityType: txType === "nft:buy" ? "NFT_BUY" : "NFT_SELL",
              tokenAddress: request.collectionAddress,
              chain: chain as Chain,
              activityData: activityData,
              price: request.price || request.nftSellParams?.price
                ? BigInt(request.price || request.nftSellParams?.price)
                : undefined,
              memo: request.memo,
              jobId: jobId,
            });
          }
        } catch (error) {
          log.error("Failed to record NFT activity", {
            error,
            jobId,
            txType,
            sender,
          });
          // Don't fail the whole transaction if activity logging fails
        }
      }
    }

    return {
      status: 200,
      json: {
        jobId,
      } satisfies JobId,
    };
  } catch (error) {
    log.error("prove catch", { error });
    return {
      status: 500,
      json: { error: "Failed to prove transactions" },
    };
  }
}
