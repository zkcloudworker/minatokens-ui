"use server";
import {
  initBlockchain,
  accountBalanceMina,
  fetchMinaAccount,
} from "@/lib/blockchain";
import { PrivateKey, PublicKey, UInt64, Mina, UInt8 } from "o1js";
import { buildTokenLaunchTransaction, LAUNCH_FEE } from "@minatokens/abi";
import {
  TokenTransaction,
  LaunchTokenStandardAdminParams,
  LaunchTokenAdvancedAdminParams,
} from "@minatokens/api";
import { ApiName, ApiResponse } from "../api-types";
import { createTransactionPayloads } from "zkcloudworker";
import { checkAddress, checkPrivateKey } from "../utils/address";
import { debug } from "@/lib/debug";
import { getWallet, getChain } from "@/lib/chain";
import { getAccountNonce } from "../../nonce";
import { accountExists } from "../../account";
const WALLET = getWallet();
const chain = getChain();
const DEBUG = debug();
const ISSUE_FEE = 1e9;

export async function deployToken(props: {
  params: LaunchTokenStandardAdminParams | LaunchTokenAdvancedAdminParams;
  name: ApiName;
  apiKeyAddress: string;
}): Promise<ApiResponse<TokenTransaction>> {
  const { params, name, apiKeyAddress } = props;
  const { symbol, decimals, uri } = params;
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

  if (!params.sender || !checkAddress(params.sender)) {
    return {
      status: 400,
      json: { error: "Invalid sender address" },
    };
  }

  if (
    "senderPrivateKey" in params &&
    params.senderPrivateKey &&
    !checkPrivateKey(params.senderPrivateKey)
  ) {
    return {
      status: 400,
      json: { error: "Invalid sender private key" },
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
      json: { error: "Invalid uri" }, // TODO: enable base64 encoded image after testing
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

  if (
    "whitelist" in params &&
    params.whitelist &&
    !Array.isArray(params.whitelist)
  ) {
    return {
      status: 400,
      json: { error: "Invalid whitelist" },
    };
  }
  if (
    "whitelist" in params &&
    params.whitelist &&
    Array.isArray(params.whitelist)
  ) {
    for (const whitelist of params.whitelist) {
      if (!checkAddress(whitelist.address)) {
        return { status: 400, json: { error: "Invalid whitelist address" } };
      }
      if (whitelist.amount && typeof whitelist.amount !== "number") {
        return { status: 400, json: { error: "Invalid whitelist amount" } };
      }
    }
  }

  const sender = PublicKey.fromBase58(params.sender);
  if (DEBUG) console.log("Sender", sender.toBase58());

  // const tokenContractPrivateKey = PrivateKey.random();
  // const adminContractPrivateKey = PrivateKey.random();
  // const contractAddress = tokenContractPrivateKey.toPublicKey();
  // if (DEBUG) console.log("Contract", contractAddress.toBase58());
  // const adminContractPublicKey = adminContractPrivateKey.toPublicKey();
  // if (DEBUG) console.log("Admin Contract", adminContractPublicKey.toBase58());
  const wallet = PublicKey.fromBase58(WALLET);
  const fee = 100_000_000;
  params.memo = params.memo
    ? params.memo.substring(0, 30)
    : `deploy token ${symbol}`;
  // const developerFee = params.developerFee
  //   ? UInt64.from(params.developerFee)
  //   : undefined;
  // const developerAddress = PublicKey.fromBase58(apiKeyAddress);
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

  params.nonce = params.nonce ?? (await getAccountNonce(sender.toBase58()));
  params.tokenContractPrivateKey =
    params.tokenContractPrivateKey ?? PrivateKey.random().toBase58();
  params.tokenAddress =
    params.tokenAddress ??
    PrivateKey.fromBase58(params.tokenContractPrivateKey)
      .toPublicKey()
      .toBase58();
  params.adminContractPrivateKey =
    params.adminContractPrivateKey ?? PrivateKey.random().toBase58();
  params.adminContractAddress =
    params.adminContractAddress ??
    PrivateKey.fromBase58(params.adminContractPrivateKey)
      .toPublicKey()
      .toBase58();
  const { tx, request } = await buildTokenLaunchTransaction({
    chain,
    args: params,
    developerAddress: apiKeyAddress,
    provingKey: wallet.toBase58(),
    provingFee: LAUNCH_FEE,
  });

  const signers: string[] = [
    params.tokenContractPrivateKey,
    params.adminContractPrivateKey,
  ];
  if ("senderPrivateKey" in params && params.senderPrivateKey)
    signers.push(params.senderPrivateKey);

  tx.sign(signers.map((s) => PrivateKey.fromBase58(s)));
  const payloads = createTransactionPayloads(tx);


  return {
    status: 200,
    json: {
      ...payloads,
      request: {
        ...request,
        txType: "token:launch",
      },
      symbol,
    } satisfies TokenTransaction,
  };
}
