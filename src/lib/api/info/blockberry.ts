"use server";
import { Mina, PublicKey, Bool, TokenId, Struct, UInt8 } from "o1js";
import { initBlockchain, fetchMinaAccount } from "@/lib/blockchain";
import {
  TransactionsListRequestParams,
  TransactionsListResponse,
  TokenHoldersRequestParams,
  TokenHoldersResponse,
  TokenHolder,
  TransactionData,
} from "@silvana-one/api";
import { ApiName, ApiResponse } from "../api-types";
import { checkAddress } from "../utils/address";
import {
  BlockberryTokenHolders,
  getTokenHoldersByTokenId,
  getTransactionsByToken,
  BlockberryTokenTransactions,
} from "@/lib/blockberry-tokens";

import { debug } from "@/lib/debug";
import { log as logtail } from "@logtail/next";
import { getChain } from "@/lib/chain";
const chain = getChain();
const log = logtail.with({
  service: "blockberry-api",
  chain,
});
const DEBUG = debug();

export async function getTransactions(props: {
  params: TransactionsListRequestParams;
  name: ApiName;
  apiKeyAddress: string;
}): Promise<ApiResponse<TransactionsListResponse>> {
  const { params, name, apiKeyAddress } = props;
  const { tokenAddress, address } = params;

  try {
    await initBlockchain();

    if (address && !checkAddress(address)) {
      return {
        status: 400,
        json: { error: "Invalid address" },
      };
    }

    if (tokenAddress && !checkAddress(tokenAddress)) {
      return {
        status: 400,
        json: { error: "Invalid token address" },
      };
    }

    if (!tokenAddress && !params.tokenId) {
      return {
        status: 400,
        json: { error: "One of tokenAddress or tokenId is required" },
      };
    }

    const tokenContractPublicKey = tokenAddress
      ? PublicKey.fromBase58(tokenAddress)
      : undefined;
    const publicKey = address ? PublicKey.fromBase58(address) : undefined;
    const tokenIdDerived = tokenContractPublicKey
      ? TokenId.derive(tokenContractPublicKey)
      : undefined;

    if (
      tokenIdDerived &&
      params.tokenId &&
      TokenId.toBase58(tokenIdDerived) !== params.tokenId
    ) {
      return {
        status: 400,
        json: { error: "TokenId does not match tokenAddress" },
      };
    }
    const tokenId =
      tokenIdDerived ??
      (params.tokenId ? TokenId.fromBase58(params.tokenId) : undefined);
    if (!tokenId) {
      return {
        status: 400,
        json: { error: "Invalid tokenId" },
      };
    }

    try {
      const result = await getTransactionsByToken({
        tokenId: TokenId.toBase58(tokenId),
      });

      const transactionsData: TransactionData[] =
        result?.data.map((tx) => ({
          hash: tx.hash,
          timestamp: tx.age,
          status: tx.status,
          updatedAccounts: tx.updatedAccounts.map((account) => ({
            accountAddress: account.accountAddress,
            isZkappAccount: account.isZkappAccount,
            verificationKeyHash: account.verificationKeyHash ?? undefined,
          })),
          accountUpdatesCount: tx.updatesCount,
          proverAddress: tx.proverAddress,
          isZkappAccount: tx.isZkappAccount,
          fee: tx.fee,
          memo: tx.memo,
        })) ?? [];

      const transactions = address
        ? transactionsData.filter((tx) => {
            return tx.updatedAccounts.some(
              (account) => account.accountAddress === address
            );
          })
        : transactionsData;

      return {
        status: 200,
        json: {
          transactions,
        },
      };
    } catch (error) {
      log.error("getTransactions: Cannot fetch transactions", {
        params,
        error,
      });
      return {
        status: 500,
        json: { error: "Failed to get transactions, try again later" },
      };
    }
  } catch (error) {
    log.error("getTransactions: catch", { params, error });
    return {
      status: 500,
      json: { error: "Failed to process request, try again later" },
    };
  }
}

export async function getTokenHolders(props: {
  params: TokenHoldersRequestParams;
  name: ApiName;
  apiKeyAddress: string;
}): Promise<ApiResponse<TokenHoldersResponse>> {
  const { params, name, apiKeyAddress } = props;
  const { address } = params;

  try {
    await initBlockchain();

    if (!address || !checkAddress(address)) {
      return {
        status: 400,
        json: { error: "Invalid address" },
      };
    }

    const tokenId = TokenId.derive(PublicKey.fromBase58(address));

    try {
      const result = await getTokenHoldersByTokenId({
        tokenId: TokenId.toBase58(tokenId),
      });

      const holders: TokenHolder[] =
        result?.data.map((tx) => ({
          address: tx.holderAddress,
          balance: tx.balance,
          percentage: tx.percentage,
          isZkappAccount: tx.isZkappAccount,
        })) ?? [];

      return {
        status: 200,
        json: {
          holders,
        },
      };
    } catch (error) {
      log.error("getTransactions: Cannot fetch transactions", {
        params,
        error,
      });
      return {
        status: 500,
        json: { error: "Failed to get transactions, try again later" },
      };
    }
  } catch (error) {
    log.error("getTransactions: catch", { params, error });
    return {
      status: 500,
      json: { error: "Failed to process request, try again later" },
    };
  }
}
