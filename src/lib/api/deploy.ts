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
  serializeTransaction,
  fungibleTokenVerificationKeys,
} from "./zkcloudworker";
import { DeployTransaction, DeployTokenParams, ApiResponse } from "./types";

import { checkAddress } from "./address";
import { debug } from "@/lib/debug";
import { getWallet, getChain } from "@/lib/chain";
import { getAccountNonce } from "../nonce";
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
  if (
    !decimals ||
    typeof decimals !== "number" ||
    decimals < 0 ||
    decimals > 18
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
  console.time("prepared tx");

  const sender = PublicKey.fromBase58(adminAddress);
  if (DEBUG) console.log("Sender", sender.toBase58());
  const balance = await accountBalanceMina(sender);
  if (DEBUG) console.log("Sender balance:", balance);
  const fee = 100_000_000;
  const tokenContractPrivateKey = PrivateKey.random();
  const adminContractPrivateKey = PrivateKey.random();
  const contractAddress = tokenContractPrivateKey.toPublicKey();
  if (DEBUG) console.log("Contract", contractAddress.toBase58());
  const adminContractPublicKey = adminContractPrivateKey.toPublicKey();
  if (DEBUG) console.log("Admin Contract", adminContractPublicKey.toBase58());
  const wallet = PublicKey.fromBase58(WALLET);
  const zkToken = new FungibleToken(contractAddress);
  const zkAdmin = new FungibleTokenAdmin(adminContractPublicKey);
  const memo = `deploy token ${symbol}`.substring(0, 30);
  const developerFee = params.developerFee
    ? UInt64.from(params.developerFee)
    : undefined;
  const developerFeeAddress = PublicKey.fromBase58(apiKeyAddress);

  await fetchMinaAccount({
    publicKey: sender,
    force: true,
  });
  await fetchMinaAccount({
    publicKey: wallet,
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

  const vk =
    fungibleTokenVerificationKeys[chain === "mainnet" ? "mainnet" : "testnet"];
  if (vk === undefined) {
    return {
      status: 500,
      json: { error: "Verification keys are undefined" },
    };
  }

  FungibleTokenAdmin._verificationKey = {
    hash: Field(vk.admin.hash),
    data: vk.admin.data,
  };
  FungibleToken._verificationKey = {
    hash: Field(vk.token.hash),
    data: vk.token.data,
  };

  const tx = await Mina.transaction({ sender, fee, memo, nonce }, async () => {
    // AccountUpdate.fundNewAccount(sender, 3);
    const feeAccountUpdate = AccountUpdate.createSigned(sender);
    feeAccountUpdate.balance.subInPlace(3_000_000_000);
    feeAccountUpdate.send({
      to: PublicKey.fromBase58(WALLET),
      amount: UInt64.from(ISSUE_FEE),
    });
    if (developerFee) {
      feeAccountUpdate.send({
        to: developerFeeAddress,
        amount: developerFee,
      });
    }
    await zkAdmin.deploy({ adminPublicKey: sender });
    zkAdmin.account.zkappUri.set(uri);
    await zkToken.deploy({
      symbol: symbol,
      src: uri,
    });
    await zkToken.initialize(
      adminContractPublicKey,
      UInt8.from(decimals),
      // We can set `startPaused` to `Bool(false)` here, because we are doing an atomic deployment
      // If you are not deploying the admin and token contracts in the same transaction,
      // it is safer to start the tokens paused, and resume them only after verifying that
      // the admin contract has been deployed
      Bool(false)
    );
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
      developerAddress: apiKeyAddress,
      developerFee: params.developerFee,
    } satisfies DeployTransaction,
  };
}
