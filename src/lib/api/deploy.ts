"use server";
import {
  initBlockchain,
  accountBalanceMina,
  fetchMinaAccount,
} from "@/lib/blockchain";
import {
  PrivateKey,
  PublicKey,
  UInt64,
  Mina,
  AccountUpdate,
  UInt8,
  Bool,
  Field,
} from "o1js";
import {
  FungibleToken,
  FungibleTokenAdmin,
  fungibleTokenVerificationKeys,
  buildTokenDeployTransaction,
  LAUNCH_FEE,
} from "@minatokens/token";
import {
  DeployTransaction,
  DeployTokenParams,
  ApiResponse,
} from "@minatokens/api";
import { serializeTransaction } from "zkcloudworker";

import { checkAddress } from "./address";
import { debug } from "@/lib/debug";
import { getWallet, getChain } from "@/lib/chain";
import { getAccountNonce } from "../nonce";
import { accountExists } from "../account";
const WALLET = getWallet();
const chain = getChain();
const DEBUG = debug();
const ISSUE_FEE = 1e9;

export async function deployToken(
  params: DeployTokenParams,
  apiKeyAddress: string
): Promise<ApiResponse<DeployTransaction>> {
  const { adminAddress, symbol, decimals, uri } = params;
  if (DEBUG) console.log("Deploying token", params);
  console.log("chain", chain);
  await initBlockchain();

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

  if (!checkAddress(adminAddress)) {
    return {
      status: 400,
      json: { error: "Invalid admin address" },
    };
  }
  if (!checkAddress(apiKeyAddress)) {
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

  if (
    decimals &&
    (typeof decimals !== "number" || decimals < 0 || decimals > 18)
  ) {
    return {
      status: 400,
      json: { error: "Invalid decimals" },
    };
  }

  if (
    !symbol ||
    typeof symbol !== "string" ||
    symbol.length === 0 ||
    symbol.length > 6
  ) {
    return {
      status: 400,
      json: { error: "Invalid symbol" },
    };
  }
  if (!uri || typeof uri !== "string" || uri.length === 0) {
    return {
      status: 400,
      json: { error: "Invalid image" },
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

  if (params.whitelist && !Array.isArray(params.whitelist)) {
    return {
      status: 400,
      json: { error: "Invalid whitelist" },
    };
  }
  if (params.whitelist) {
    for (const whitelist of params.whitelist) {
      if (!checkAddress(whitelist.address)) {
        return { status: 400, json: { error: "Invalid whitelist address" } };
      }
      if (whitelist.amount && typeof whitelist.amount !== "number") {
        return { status: 400, json: { error: "Invalid whitelist amount" } };
      }
    }
  }
  console.time("prepared tx");
  const sender = PublicKey.fromBase58(adminAddress);
  if (DEBUG) console.log("Sender", sender.toBase58());

  const tokenContractPrivateKey = PrivateKey.random();
  const adminContractPrivateKey = PrivateKey.random();
  const contractAddress = tokenContractPrivateKey.toPublicKey();
  if (DEBUG) console.log("Contract", contractAddress.toBase58());
  const adminContractPublicKey = adminContractPrivateKey.toPublicKey();
  if (DEBUG) console.log("Admin Contract", adminContractPublicKey.toBase58());
  const wallet = PublicKey.fromBase58(WALLET);
  const fee = 100_000_000;
  const memo = params.memo
    ? params.memo.substring(0, 30)
    : `deploy token ${symbol}`;
  const developerFee = params.developerFee
    ? UInt64.from(params.developerFee)
    : undefined;
  const developerAddress = PublicKey.fromBase58(apiKeyAddress);
  await fetchMinaAccount({
    publicKey: sender,
    force: true,
  });

  if (!Mina.hasAccount(sender)) {
    console.error("Sender does not have account");
    return {
      status: 400,
      json: {
        error: `Account ${sender.toBase58()} not activated. Please send 1 MINA to your account to activate it.`,
      },
    };
  }

  const balance = await accountBalanceMina(sender);
  if (DEBUG) console.log("Sender balance:", balance);

  const requiredBalance = 3 + (ISSUE_FEE + fee) / 1_000_000_000;
  if (requiredBalance > balance) {
    return {
      status: 400,
      json: {
        error: `Insufficient balance of the sender: ${balance} MINA. Required: ${requiredBalance} MINA`,
      },
    };
  }

  const nonce = params.nonce ?? (await getAccountNonce(sender.toBase58()));

  const { tx, whitelist } = await buildTokenDeployTransaction({
    chain,
    fee: UInt64.from(fee),
    sender,
    nonce,
    memo,
    adminContractAddress: adminContractPublicKey,
    adminAddress: sender,
    tokenAddress: contractAddress,
    uri,
    symbol,
    whitelist: params.whitelist,
    provingKey: wallet,
    provingFee: UInt64.from(LAUNCH_FEE),
    decimals: UInt8.from(decimals ?? 9),
    developerAddress,
    developerFee,
  });

  tx.sign([tokenContractPrivateKey, adminContractPrivateKey]);
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
      txType: "deploy",
      senderAddress: sender.toBase58(),
      tokenAddress: contractAddress.toBase58(),
      adminContractAddress: adminContractPublicKey.toBase58(),
      tokenContractPrivateKey: tokenContractPrivateKey.toBase58(),
      adminContractPrivateKey: adminContractPrivateKey.toBase58(),
      symbol,
      serializedTransaction,
      transaction,
      wallet_payload,
      mina_signer_payload,
      uri,
      memo,
      nonce,
      whitelist,
      developerAddress: apiKeyAddress,
      developerFee: params.developerFee,
    } satisfies DeployTransaction,
  };
}
