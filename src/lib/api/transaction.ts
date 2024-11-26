"use server";
import {
  initBlockchain,
  accountBalanceMina,
  fetchMinaAccount,
} from "@/lib/blockchain";
import {
  PublicKey,
  UInt64,
  Mina,
  AccountUpdate,
  TokenId,
  PrivateKey,
} from "o1js";
import {
  serializeTransaction,
  buildTokenTransaction,
  TRANSACTION_FEE,
  getTokenTransactionSender,
} from "zkcloudworker";
import { TransactionTokenParams, ApiResponse, TokenTransaction } from "./types";
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

export async function tokenTransaction(
  params: TransactionTokenParams,
  apiKeyAddress: string
): Promise<ApiResponse<TokenTransaction>> {
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

  if (params.price && typeof params.price !== "number") {
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

  if (!apiKeyAddress || !checkAddress(apiKeyAddress)) {
    return {
      status: 400,
      json: { error: "Invalid API key address" },
    };
  }

  if (!params.from || !checkAddress(params.from)) {
    return {
      status: 400,
      json: { error: "Invalid from address" },
    };
  }

  if (params.developerFee && !(await accountExists(apiKeyAddress))) {
    return {
      status: 400,
      json: { error: "Developer address is not activated" },
    };
  }

  if (params.to && !checkAddress(params.to)) {
    return {
      status: 400,
      json: { error: "Invalid to address" },
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

  if (params.amount && params.amount <= 0) {
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
  const newKey = PrivateKey.random();
  const newAddress = newKey.toPublicKey();

  const to = params.to ? PublicKey.fromBase58(params.to) : newAddress;
  const from = PublicKey.fromBase58(params.from);
  if (DEBUG) console.log("to:", to.toBase58());
  const amount = params.amount ? UInt64.from(params.amount) : UInt64.from(0);
  const price = params.price ? UInt64.from(params.price) : undefined;
  const developerFee = params.developerFee
    ? UInt64.from(params.developerFee)
    : undefined;
  const developerFeeAddress = PublicKey.fromBase58(apiKeyAddress);
  const sender = getTokenTransactionSender({ txType, from, to });

  if (DEBUG) console.log("amount:", amount.toBigInt());

  const tokenId = TokenId.derive(tokenAddress);

  const memo =
    params.memo ??
    `${txType} ${Number(amount.toBigInt()) / 1_000_000_000} ${symbol}`.length >
      30
      ? `${txType} ${symbol}`.substring(0, 30)
      : `${txType} ${Number(amount.toBigInt()) / 1_000_000_000} ${symbol}`;
  if (DEBUG) console.log("memo:", memo);
  try {
    await fetchMinaAccount({
      publicKey: sender,
      force: false,
    });
    await fetchMinaAccount({
      publicKey: from,
      force: false,
    });
    await fetchMinaAccount({
      publicKey: from,
      tokenId,
      force: false,
    });
    await fetchMinaAccount({
      publicKey: to,
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
    if (!Mina.hasAccount(from, tokenId)) {
      return {
        status: 400,
        json: {
          error: `Token account ${from.toBase58()} not found, no tokens to transfer`,
        },
      };
    }
    const senderTokenBalance = Mina.hasAccount(from, tokenId)
      ? Mina.getAccount(from, tokenId).balance
      : UInt64.from(0);
    if (DEBUG)
      console.log(
        "senderTokenBalance:",
        Number(senderTokenBalance.toBigInt()) / 1_000_000_000,
        symbol
      );
    if (senderTokenBalance.toBigInt() < amount.toBigInt()) {
      return {
        status: 400,
        json: {
          error: `Account ${from.toBase58()} does not have enough tokens. Required: ${
            Number(amount.toBigInt()) / 1_000_000_000
          } ${symbol}, available: ${
            Number(senderTokenBalance.toBigInt()) / 1_000_000_000
          } ${symbol}`,
        },
      };
    }
  }

  const balance = await accountBalanceMina(sender);
  const isNewAccount = Mina.hasAccount(to, tokenId) === false;
  const requiredBalance = isNewAccount ? 1 : 0 + (FEE + fee) / 1_000_000_000;
  if (requiredBalance > balance) {
    return {
      status: 400,
      json: {
        error: `Insufficient balance of the sender: ${balance} MINA. Required: ${requiredBalance} MINA`,
      },
    };
  }

  const nonce = params.nonce ?? (await getAccountNonce(sender.toBase58()));
  if (DEBUG) console.log("nonce:", nonce);

  const { tx, whitelist } = await buildTokenTransaction({
    txType,
    chain,
    fee: UInt64.from(fee),
    nonce,
    memo,
    tokenAddress,
    from,
    to,
    amount,
    price,
    developerFee,
    developerAddress: PublicKey.fromBase58(apiKeyAddress),
    whitelist: params.whitelist,
    provingKey: wallet,
    provingFee: UInt64.from(TRANSACTION_FEE),
  });
  if (!params.to) tx.sign([newKey]);

  const serializedTransaction = serializeTransaction(tx);
  const transaction = tx.toJSON();
  const wallet_payload = {
    transaction,
    nonce,
    onlySign: true,
    feePayer: {
      fee: fee,
      memo: memo,
    },
  };

  const mina_signer_payload = {
    zkappCommand: JSON.parse(transaction),
    feePayer: {
      feePayer: sender.toBase58(),
      fee: fee,
      nonce: nonce,
      memo: memo,
    },
  };
  console.timeEnd("prepared tx");

  return {
    status: 200,
    json: {
      txType,
      tokenAddress: tokenAddress.toBase58(),
      symbol,
      wallet_payload,
      mina_signer_payload,
      serializedTransaction,
      transaction,
      to: to.toBase58(),
      from: from.toBase58(),
      toPrivateKey: params.to ? undefined : newKey.toBase58(),
      amount: Number(amount.toBigInt()),
      price: price ? Number(price.toBigInt()) : undefined,
      memo,
      nonce,
      whitelist,
      developerAddress: apiKeyAddress,
      developerFee: params.developerFee,
    } satisfies TokenTransaction,
  };
}
