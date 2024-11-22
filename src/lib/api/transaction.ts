"use server";
import {
  initBlockchain,
  accountBalanceMina,
  fetchMinaAccount,
} from "@/lib/blockchain";
import { PublicKey, UInt64, Mina, AccountUpdate } from "o1js";
import { FungibleToken, serializeTransaction } from "./zkcloudworker";
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
  const { tokenAddress, senderAddress, txType: action } = params;
  if (DEBUG) console.log("Token transaction", params);
  console.log("chain", chain);
  await initBlockchain();
  const FEE = action === "mint" ? MINT_FEE : TRANSFER_FEE;

  if (params.nonce && typeof params.nonce !== "number") {
    return {
      status: 400,
      json: { error: "Invalid nonce" },
    };
  }

  if (params.developerFee && typeof params.developerFee !== "number") {
    return {
      status: 400,
      json: { error: "Invalid developer fee" },
    };
  }

  if (!checkAddress(tokenAddress)) {
    return {
      status: 400,
      json: { error: "Invalid token contract address" },
    };
  }

  if (!checkAddress(apiKeyAddress)) {
    return {
      status: 400,
      json: { error: "Invalid API key address" },
    };
  }

  if (!checkAddress(senderAddress)) {
    return {
      status: 400,
      json: { error: "Invalid admin address" },
    };
  }

  if (params.developerFee && !(await accountExists(apiKeyAddress))) {
    return {
      status: 400,
      json: { error: "Developer address is not activated" },
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
    tokenAddress,
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

  const sender = PublicKey.fromBase58(senderAddress);
  if (DEBUG) console.log("Sender", sender.toBase58());
  const balance = await accountBalanceMina(sender);
  if (DEBUG) console.log("Sender balance:", balance);
  const fee = 100_000_000;
  const contractAddress = PublicKey.fromBase58(tokenAddress);
  if (DEBUG) console.log("Contract", contractAddress.toBase58());
  const adminContractPublicKey = PublicKey.fromBase58(adminContractAddress);
  if (DEBUG) console.log("Admin Contract", adminContractPublicKey.toBase58());
  const wallet = PublicKey.fromBase58(WALLET);

  const to = PublicKey.fromBase58(params.to);
  if (DEBUG) console.log("to:", to.toBase58());
  const amount = UInt64.from(params.amount);
  const developerFee = params.developerFee
    ? UInt64.from(params.developerFee)
    : undefined;
  const developerFeeAddress = PublicKey.fromBase58(apiKeyAddress);

  if (DEBUG) console.log("amount:", amount.toBigInt());

  const zkToken = new FungibleToken(contractAddress);
  const tokenId = zkToken.deriveTokenId();

  const memo =
    params.memo ??
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
      force: false,
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
      force: false,
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
    const senderTokenBalance = Mina.hasAccount(sender, tokenId)
      ? Mina.getAccount(sender, tokenId).balance
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

  const nonce = params.nonce ?? (await getAccountNonce(sender.toBase58()));
  if (DEBUG) console.log("nonce:", nonce);
  const tx = await Mina.transaction({ sender, fee, memo, nonce }, async () => {
    // if (isNewAccount) AccountUpdate.fundNewAccount(sender, 1);
    const feeAccountUpdate = AccountUpdate.createSigned(sender);
    if (isNewAccount) feeAccountUpdate.balance.subInPlace(1_000_000_000);
    feeAccountUpdate.send({
      to: PublicKey.fromBase58(WALLET),
      amount: UInt64.from(MINT_FEE),
    });
    if (developerFee) {
      feeAccountUpdate.send({
        to: developerFeeAddress,
        amount: developerFee,
      });
    }
    if (action === "mint") await zkToken.mint(to, amount);
    else await zkToken.transfer(sender, to, amount);
  });

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
      txType: action,
      senderAddress: sender.toBase58(),
      tokenAddress,
      adminContractAddress,
      symbol,
      wallet_payload,
      mina_signer_payload,
      serializedTransaction,
      transaction,
      to: to.toBase58(),
      amount: Number(amount.toBigInt()),
      memo,
      nonce,
      developerAddress: apiKeyAddress,
      developerFee: params.developerFee,
    } satisfies TokenTransaction,
  };
}
