"use server";
import {
  initBlockchain,
  accountBalanceMina,
  fetchMinaAccount,
} from "@/lib/blockchain";
import { PublicKey, UInt64, Mina, AccountUpdate } from "o1js";
import { FungibleToken, serializeTransaction } from "./zkcloudworker";
import { TransactionTokenParams, ApiResponse, TokenTransaction } from "./types";

import { checkAddress } from "@/lib/address";
import { debug } from "@/lib/debug";
import { getWallet, getChain } from "@/lib/chain";
import { getAccountNonce } from "../nonce";
const WALLET = getWallet();
const chain = getChain();
const DEBUG = debug();
const MINT_FEE = 1e8;
const TRANSFER_FEE = 1e8;

export async function tokenTransaction(
  params: TransactionTokenParams
): Promise<ApiResponse<TokenTransaction>> {
  const { tokenAddress, symbol, senderAddress, txType: action } = params;
  if (DEBUG) console.log("Token transaction", params);
  console.log("chain", chain);
  await initBlockchain();
  const FEE = action === "mint" ? MINT_FEE : TRANSFER_FEE;

  if (!checkAddress(tokenAddress)) {
    return {
      status: 400,
      json: { error: "Invalid token contract address" },
    };
  }

  if (!checkAddress(params.adminContractAddress)) {
    return {
      status: 400,
      json: { error: "Invalid admin contract address" },
    };
  }

  if (!checkAddress(senderAddress)) {
    return {
      status: 400,
      json: { error: "Invalid admin address" },
    };
  }

  if (!checkAddress(params.to)) {
    return {
      status: 400,
      json: { error: "Invalid to address" },
    };
  }

  if (params.amount <= 0) {
    return {
      status: 400,
      json: { error: "Invalid amount" },
    };
  }

  if (!symbol || typeof symbol !== "string" || symbol.length === 0) {
    return {
      status: 400,
      json: { error: "Invalid symbol" },
    };
  }

  console.time("prepared tx");

  const sender = PublicKey.fromBase58(senderAddress);
  if (DEBUG) console.log("Sender", sender.toBase58());
  const balance = await accountBalanceMina(sender);
  if (DEBUG) console.log("Sender balance:", balance);
  const fee = 100_000_000;
  const contractAddress = PublicKey.fromBase58(tokenAddress);
  if (DEBUG) console.log("Contract", contractAddress.toBase58());
  const adminContractPublicKey = PublicKey.fromBase58(
    params.adminContractAddress
  );
  if (DEBUG) console.log("Admin Contract", adminContractPublicKey.toBase58());
  const wallet = PublicKey.fromBase58(WALLET);

  const to = PublicKey.fromBase58(params.to);
  if (DEBUG) console.log("to:", to.toBase58());
  const amount = UInt64.from(params.amount);

  if (DEBUG) console.log("amount:", amount.toBigInt());

  const zkToken = new FungibleToken(contractAddress);
  const tokenId = zkToken.deriveTokenId();

  const memo =
    `${action} ${Number(amount.toBigInt()) / 1_000_000_000} ${symbol}`.length >
    30
      ? `${action} ${symbol}`.substring(0, 30)
      : `${action} ${Number(amount.toBigInt()) / 1_000_000_000} ${symbol}`;
  if (DEBUG) console.log("memo:", memo);
  try {
    await fetchMinaAccount({
      publicKey: sender,
      force: true,
    });
    await fetchMinaAccount({
      publicKey: sender,
      tokenId,
      force: true,
    });
    await fetchMinaAccount({
      publicKey: contractAddress,
      force: true,
    });
    await fetchMinaAccount({
      publicKey: adminContractPublicKey,
      force: true,
    });
    await fetchMinaAccount({
      publicKey: contractAddress,
      tokenId,
      force: true,
    });
    await fetchMinaAccount({
      publicKey: to,
      tokenId,
      force: true,
    });
    await fetchMinaAccount({
      publicKey: wallet,
      force: true,
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

  if (action === "transfer") {
    if (!Mina.hasAccount(sender, tokenId)) {
      return {
        status: 400,
        json: {
          error: `Token account ${sender.toBase58()} not found, no tokens to transfer`,
        },
      };
    }
    const senderTokenBalance = Mina.getAccount(sender, tokenId).balance;
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
          error: `Account ${sender.toBase58()} does not have enough tokens. Required: ${
            Number(amount.toBigInt()) / 1_000_000_000
          } ${symbol}, available: ${
            Number(senderTokenBalance.toBigInt()) / 1_000_000_000
          } ${symbol}`,
        },
      };
    }
  }

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

  const nonce = await getAccountNonce(sender.toBase58());
  if (DEBUG) console.log("nonce:", nonce);
  const tx = await Mina.transaction({ sender, fee, memo, nonce }, async () => {
    if (isNewAccount) AccountUpdate.fundNewAccount(sender, 1);
    const provingFee = AccountUpdate.createSigned(sender);
    provingFee.send({
      to: PublicKey.fromBase58(WALLET),
      amount: UInt64.from(MINT_FEE),
    });
    if (action === "mint") await zkToken.mint(to, amount);
    else await zkToken.transfer(sender, to, amount);
  });

  const serializedTransaction = serializeTransaction(tx);
  const transaction = tx.toJSON();
  const txJSON = JSON.parse(transaction);
  const payload = {
    transaction,
    nonce,
    onlySign: true,
    feePayer: {
      fee: fee,
      memo: memo,
    },
  };
  console.timeEnd("prepared tx");

  return {
    status: 200,
    json: {
      serializedTransaction,
      transaction,
      payload,
      tokenAddress,
      adminContractAddress: params.adminContractAddress,
    } satisfies TokenTransaction,
  };
}
