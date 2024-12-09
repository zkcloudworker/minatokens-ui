"use server";
import {
  initBlockchain,
  accountBalanceMina,
  fetchMinaAccount,
} from "@/lib/blockchain";
import { PublicKey, UInt64, Mina, TokenId, PrivateKey } from "o1js";
import { buildTokenTransaction, TRANSACTION_FEE } from "@minatokens/token";
import { createTransactionPayloads } from "zkcloudworker";
import {
  TransactionParams,
  ApiResponse,
  TokenTransaction,
  TokenTransactions,
  LaunchTokenStandardAdminParams,
  LaunchTokenAdvancedAdminParams,
  AirdropTransactionParams,
  TransferTransactionParams,
  MintTransactionParams,
} from "@minatokens/api";
import { getTokenSymbolAndAdmin } from "./symbol";
import { checkAddress } from "./address";
import { accountExists } from "@/lib/account";
import { debug } from "@/lib/debug";
import { getWallet, getChain } from "@/lib/chain";
import { getAccountNonce } from "../nonce";
const WALLET = getWallet();
const chain = getChain();
const DEBUG = debug();
const MINT_FEE = 1e8;
const TRANSFER_FEE = 1e8;

export type TokenTransactionParams = Exclude<
  TransactionParams,
  | LaunchTokenStandardAdminParams
  | LaunchTokenAdvancedAdminParams
  | AirdropTransactionParams
>;

export async function airdropTransaction(
  params: AirdropTransactionParams,
  apiKeyAddress: string
): Promise<ApiResponse<TokenTransactions>> {
  if (!params.sender || !checkAddress(params.sender)) {
    return {
      status: 400,
      json: { error: "Invalid sender address" },
    };
  }
  if (params.nonce && typeof params.nonce !== "number") {
    return {
      status: 400,
      json: { error: "Invalid nonce" },
    };
  }
  if (!params.tokenAddress || !checkAddress(params.tokenAddress)) {
    return {
      status: 400,
      json: { error: "Invalid token contract address" },
    };
  }

  const sender = PublicKey.fromBase58(params.sender);
  const tokenAddress = PublicKey.fromBase58(params.tokenAddress);
  const tokenId = TokenId.derive(tokenAddress);
  await fetchMinaAccount({
    publicKey: sender,
    force: false,
  });

  await fetchMinaAccount({
    publicKey: sender,
    tokenId,
    force: false,
  });
  if (!Mina.hasAccount(sender, tokenId)) {
    return {
      status: 400,
      json: {
        error: `Token account ${sender.toBase58()} not found, no tokens to transfer`,
      },
    };
  }
  const senderTokenBalance = Mina.hasAccount(sender, tokenId)
    ? Mina.getAccount(sender, tokenId).balance
    : UInt64.from(0);
  if (DEBUG)
    console.log(
      "senderTokenBalance:",
      Number(senderTokenBalance.toBigInt()) / 1_000_000_000
    );
  const requiredBalance = params.recipients.reduce(
    (acc, recipient) => acc + recipient.amount,
    0
  );
  if (Number(senderTokenBalance.toBigInt()) < requiredBalance) {
    return {
      status: 400,
      json: {
        error: `Account ${sender.toBase58()} does not have enough tokens. Required: ${
          requiredBalance / 1_000_000_000
        }, available: ${Number(senderTokenBalance.toBigInt()) / 1_000_000_000}`,
      },
    };
  }
  const symbolResponse = await getTokenSymbolAndAdmin({
    tokenAddress: params.tokenAddress,
  });
  if (symbolResponse.status !== 200) {
    return symbolResponse;
  }

  const symbol = symbolResponse.json.tokenSymbol;
  let nonce = params.nonce ?? (await getAccountNonce(sender.toBase58()));
  if (DEBUG) console.log("nonce:", nonce);
  const txs: TokenTransaction[] = [];
  for (const recipient of params.recipients) {
    const to = recipient.address;
    if (!to || !checkAddress(to)) {
      return {
        status: 400,
        json: { error: "Invalid recipient address" },
      };
    }
    const amount = recipient.amount;
    if (!amount || typeof amount !== "number") {
      return {
        status: 400,
        json: { error: "Invalid recipient address" },
      };
    }
    if (recipient.memo && typeof recipient.memo !== "string") {
      return {
        status: 400,
        json: { error: "Invalid memo" },
      };
    }
    const memo =
      recipient.memo ??
      `airdrop ${amount / 1_000_000_000} ${symbol}`.length > 30
        ? `airdrop ${symbol}`.substring(0, 30)
        : `airdrop ${amount / 1_000_000_000} ${symbol}`;
    const tx: TransferTransactionParams = {
      txType: "transfer",
      sender: sender.toBase58(),
      to,
      amount,
      memo,
      tokenAddress: params.tokenAddress,
      nonce: nonce++,
    };
    const transferTx = await tokenTransaction(tx, apiKeyAddress);
    if (transferTx.status !== 200) {
      return transferTx;
    }
    txs.push(transferTx.json);
  }
  return {
    status: 200,
    json: { txs },
  };
}

export async function tokenTransaction(
  params: TokenTransactionParams,
  apiKeyAddress: string
): Promise<ApiResponse<TokenTransaction>> {
  try {
    const { txType } = params;
    if (DEBUG) console.log("Token transaction", params);
    console.log("chain", chain);
    await initBlockchain();
    const FEE = txType === "mint" ? MINT_FEE : TRANSFER_FEE;

    if (params.nonce && typeof params.nonce !== "number") {
      return {
        status: 400,
        json: { error: "Invalid nonce" },
      };
    }

    if ("price" in params && params.price && typeof params.price !== "number") {
      return {
        status: 400,
        json: { error: "Invalid price" },
      };
    }

    if ((txType === "offer" || txType === "bid") && !params.price) {
      return {
        status: 400,
        json: { error: "Price is required for offer and bid" },
      };
    }

    if (params.developerFee && typeof params.developerFee !== "number") {
      return {
        status: 400,
        json: { error: "Invalid developer fee" },
      };
    }

    if (!params.tokenAddress || !checkAddress(params.tokenAddress)) {
      return {
        status: 400,
        json: { error: "Invalid token contract address" },
      };
    }

    if (!params.sender || !checkAddress(params.sender)) {
      return {
        status: 400,
        json: { error: "Invalid sender address" },
      };
    }

    if (!apiKeyAddress || !checkAddress(apiKeyAddress)) {
      return {
        status: 400,
        json: { error: "Invalid API key address" },
      };
    }

    if (params.developerFee && !(await accountExists(apiKeyAddress))) {
      return {
        status: 400,
        json: { error: "Developer address is not activated" },
      };
    }

    if ("to" in params && params.to && !checkAddress(params.to)) {
      return {
        status: 400,
        json: { error: "Invalid to address" },
      };
    }

    if (
      "offerAddress" in params &&
      params.offerAddress &&
      !checkAddress(params.offerAddress)
    ) {
      return {
        status: 400,
        json: { error: "Invalid offer address" },
      };
    }

    if (
      "bidAddress" in params &&
      params.bidAddress &&
      !checkAddress(params.bidAddress)
    ) {
      return {
        status: 400,
        json: { error: "Invalid bid address" },
      };
    }

    if (txType === "transfer" && !params.to) {
      return {
        status: 400,
        json: { error: "To address is required for transfer" },
      };
    }

    if (txType === "mint" && !params.to) {
      return {
        status: 400,
        json: { error: "To address is required for mint" },
      };
    }

    if ("amount" in params && params.amount && params.amount <= 0) {
      return {
        status: 400,
        json: { error: "Invalid amount" },
      };
    }

    if (params.memo && typeof params.memo !== "string") {
      return {
        status: 400,
        json: { error: "Invalid memo" },
      };
    }

    if (
      params.memo &&
      typeof params.memo === "string" &&
      params.memo.length > 30
    ) {
      return {
        status: 400,
        json: { error: "Memo is too long" },
      };
    }

    const sender = PublicKey.fromBase58(params.sender);
    // const newKey =
    //   txType === "bid" && "bidPrivateKey" in params && params.bidPrivateKey
    //     ? PrivateKey.fromBase58(params.bidPrivateKey)
    //     : txType === "offer" &&
    //       "offerPrivateKey" in params &&
    //       params.offerPrivateKey
    //     ? PrivateKey.fromBase58(params.offerPrivateKey)
    //     : PrivateKey.random();
    // const newAddress = newKey.toPublicKey();
    // const from =
    //   txType === "buy" || txType === "withdrawOffer"
    //     ? PublicKey.fromBase58(params.offerAddress)
    //     : txType === "withdrawBid" || txType === "sell"
    //     ? PublicKey.fromBase58(params.bidAddress)
    //     : sender;
    // if (DEBUG) console.log("from:", from.toBase58());

    // const to =
    //   txType === "offer" || txType === "bid"
    //     ? newAddress
    //     : txType === "buy" || txType === "withdrawOffer"
    //     ? sender
    //     : "to" in params && params.to
    //     ? PublicKey.fromBase58(params.to)
    //     : newAddress;
    // if (DEBUG) console.log("to:", to.toBase58());

    const symbolResponse = await getTokenSymbolAndAdmin({
      tokenAddress: params.tokenAddress,
    });
    if (symbolResponse.status !== 200) {
      return symbolResponse;
    }

    const symbol = symbolResponse.json.tokenSymbol;
    const adminContractAddress = symbolResponse.json.adminContractAddress;
    if (!checkAddress(adminContractAddress)) {
      return {
        status: 400,
        json: { error: "Invalid admin contract address" },
      };
    }
    console.time("prepared tx");
    const fee = 100_000_000;
    const tokenAddress = PublicKey.fromBase58(params.tokenAddress);
    if (DEBUG) console.log("Contract", tokenAddress.toBase58());
    const adminContractPublicKey = PublicKey.fromBase58(adminContractAddress);
    if (DEBUG) console.log("Admin Contract", adminContractPublicKey.toBase58());
    const wallet = PublicKey.fromBase58(WALLET);

    const amount =
      "amount" in params && params.amount
        ? UInt64.from(params.amount)
        : UInt64.from(0);
    const price =
      "price" in params && params.price ? UInt64.from(params.price) : undefined;
    const developerFee =
      "developerFee" in params && params.developerFee
        ? UInt64.from(params.developerFee)
        : undefined;
    const developerFeeAddress = PublicKey.fromBase58(apiKeyAddress);

    if (DEBUG) console.log("amount:", amount.toBigInt());

    const tokenId = TokenId.derive(tokenAddress);

    const memo =
      params.memo ??
      `${txType} ${Number(amount.toBigInt()) / 1_000_000_000} ${symbol}`
        .length > 30
        ? `${txType} ${symbol}`.substring(0, 30)
        : `${txType} ${Number(amount.toBigInt()) / 1_000_000_000} ${symbol}`;
    if (DEBUG) console.log("memo:", memo);
    try {
      await fetchMinaAccount({
        publicKey: sender,
        force: false,
      });

      await fetchMinaAccount({
        publicKey: sender,
        tokenId,
        force: false,
      });
      if ("to" in params && params.to)
        await fetchMinaAccount({
          publicKey: PublicKey.fromBase58(params.to),
          tokenId,
          force: false,
        });
    } catch (error) {
      return {
        status: 400,
        json: { error: "Error fetching Mina accounts" },
      };
    }
    if (DEBUG) console.log("Fetching accounts done");

    if (!Mina.hasAccount(sender)) {
      return {
        status: 400,
        json: {
          error: `Account ${sender.toBase58()} not found. Please fund your account or try again later, after all the previous transactions are included in the block.`,
        },
      };
    }

    if (txType === "transfer" || txType === "offer") {
      if (!Mina.hasAccount(sender, tokenId)) {
        return {
          status: 400,
          json: {
            error: `Token account ${sender.toBase58()} not found, no tokens to transfer`,
          },
        };
      }
      const senderTokenBalance = Mina.hasAccount(sender, tokenId)
        ? Mina.getAccount(sender, tokenId).balance
        : UInt64.from(0);
      if (DEBUG)
        console.log(
          "senderTokenBalance:",
          Number(senderTokenBalance.toBigInt()) / 1_000_000_000,
          symbol
        );
      const requiredBalance = Number(amount.toBigInt());
      if (Number(senderTokenBalance.toBigInt()) < requiredBalance) {
        return {
          status: 400,
          json: {
            error: `Account ${sender.toBase58()} does not have enough tokens. Required: ${
              Number(amount.toBigInt()) / 1_000_000_000
            } ${symbol}, available: ${
              Number(senderTokenBalance.toBigInt()) / 1_000_000_000
            } ${symbol}`,
          },
        };
      }
    }

    const balance = await accountBalanceMina(sender);
    const isNewAccount =
      "to" in params && params.to
        ? Mina.hasAccount(PublicKey.fromBase58(params.to), tokenId) === false
        : false;
    const requiredBalance = isNewAccount ? 1 : 0 + (FEE + fee) / 1_000_000_000;
    if (requiredBalance > balance) {
      return {
        status: 400,
        json: {
          error: `Insufficient balance of the sender: ${balance} MINA. Required: ${requiredBalance} MINA`,
        },
      };
    }
    if (txType === "offer") {
      params.offerPrivateKey =
        params.offerPrivateKey ?? PrivateKey.random().toBase58();
      params.offerAddress =
        params.offerAddress ??
        PrivateKey.fromBase58(params.offerPrivateKey).toPublicKey().toBase58();

      if (
        PrivateKey.fromBase58(params.offerPrivateKey)
          .toPublicKey()
          .toBase58() !== PublicKey.fromBase58(params.offerAddress).toBase58()
      )
        return {
          status: 400,
          json: { error: "Invalid offer private key" },
        };
    }

    if (txType === "bid") {
      params.bidPrivateKey =
        params.bidPrivateKey ?? PrivateKey.random().toBase58();

      params.bidAddress =
        params.bidAddress ??
        PrivateKey.fromBase58(params.bidPrivateKey).toPublicKey().toBase58();

      if (
        PrivateKey.fromBase58(params.bidPrivateKey).toPublicKey().toBase58() !==
        PublicKey.fromBase58(params.bidAddress).toBase58()
      )
        return {
          status: 400,
          json: { error: "Invalid bid private key" },
        };
    }

    params.nonce = params.nonce ?? (await getAccountNonce(sender.toBase58()));

    const { tx, request } = await buildTokenTransaction({
      chain,
      args: params,
      developerAddress: apiKeyAddress,
      provingKey: wallet.toBase58(),
      provingFee: TRANSACTION_FEE,
    });
    if (
      txType === "offer" &&
      "offerPrivateKey" in params &&
      params.offerPrivateKey
    )
      tx.sign([PrivateKey.fromBase58(params.offerPrivateKey)]);
    if (txType === "bid" && "bidPrivateKey" in params && params.bidPrivateKey)
      tx.sign([PrivateKey.fromBase58(params.bidPrivateKey)]);
    const payloads = createTransactionPayloads(tx);
    console.timeEnd("prepared tx");

    return {
      status: 200,
      json: {
        txType,
        ...payloads,
        symbol,
        request,
        developerAddress: apiKeyAddress,
      } satisfies TokenTransaction,
    };
  } catch (error) {
    return {
      status: 400,
      json: {
        error:
          error instanceof Error
            ? error.message
            : "Error building token transaction",
      },
    };
  }
}
