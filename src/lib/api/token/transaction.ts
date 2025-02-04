"use server";
import {
  initBlockchain,
  accountBalanceMina,
  fetchMinaAccount,
} from "@/lib/blockchain";
import { PublicKey, UInt64, Mina, TokenId, PrivateKey } from "o1js";
import { buildTokenTransaction, TRANSACTION_FEE } from "@minatokens/abi";
import { createTransactionPayloads } from "zkcloudworker";
import {
  TokenTransaction,
  TokenTransactions,
  LaunchTokenStandardAdminParams,
  LaunchTokenAdvancedAdminParams,
  TokenAirdropTransactionParams,
  TokenTransferTransactionParams,
  TokenMintTransactionParams,
  TokenTransactionBaseParams,
  TokenTransactionParams,
  TokenTransactionType,
  TokenOfferTransactionParams,
  TokenBidTransactionParams,
} from "@minatokens/api";
import { ApiName, ApiResponse } from "../api-types";
import { getTokenSymbolAndAdmin } from "../utils/symbol";
import { checkAddress, checkPrivateKey } from "../utils/address";
import { accountExists } from "@/lib/account";
import { debug } from "@/lib/debug";
import { getWallet, getChain } from "@/lib/chain";
import { getAccountNonce } from "../../nonce";
const WALLET = getWallet();
const chain = getChain();
const DEBUG = debug();
const MINT_FEE = 1e8;
const TRANSFER_FEE = 1e8;

export type DeployedTokenTransactionParams = Exclude<
  TokenTransactionParams,
  | LaunchTokenStandardAdminParams
  | LaunchTokenAdvancedAdminParams
  | TokenAirdropTransactionParams
>;

export async function airdropTransaction(props: {
  params: TokenAirdropTransactionParams;
  name: ApiName;
  apiKeyAddress: string;
}): Promise<ApiResponse<TokenTransactions>> {
  const { params, name, apiKeyAddress } = props;
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
    const txParams: TokenTransferTransactionParams = {
      sender: sender.toBase58(),
      senderPrivateKey: params.senderPrivateKey,
      to,
      amount,
      memo,
      tokenAddress: params.tokenAddress,
      nonce: nonce++,
    };
    const transferTx = await tokenTransaction({
      params: txParams,
      name: "token:transfer",
      apiKeyAddress,
    });
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

export async function tokenTransaction(props: {
  params: DeployedTokenTransactionParams;
  name: ApiName;
  apiKeyAddress: string;
}): Promise<ApiResponse<TokenTransaction>> {
  try {
    const { name, params: txParams, apiKeyAddress } = props;
    const txType = name as Exclude<
      TokenTransactionType,
      "token:launch" | "token:airdrop"
    >;
    if (DEBUG) console.log("Token transaction", name, txParams);
    if (DEBUG) console.log("chain", chain);
    await initBlockchain();
    const FEE = txType === "token:mint" ? MINT_FEE : TRANSFER_FEE;

    if (!checkAddress(txParams.sender)) {
      return {
        status: 400,
        json: { error: "Invalid sender address" },
      };
    }

    if (txParams.nonce && typeof txParams.nonce !== "number") {
      return {
        status: 400,
        json: { error: "Invalid nonce" },
      };
    }

    if (
      "price" in txParams &&
      txParams.price &&
      typeof txParams.price !== "number"
    ) {
      return {
        status: 400,
        json: { error: "Invalid price" },
      };
    }

    if (
      (txType === "token:offer:create" || txType === "token:bid:create") &&
      (!("price" in txParams) ||
        !txParams.price ||
        typeof txParams.price !== "number" ||
        txParams.price <= 0)
    ) {
      return {
        status: 400,
        json: { error: "Price is required for offer and bid" },
      };
    }

    if (txParams.developerFee && typeof txParams.developerFee !== "number") {
      return {
        status: 400,
        json: { error: "Invalid developer fee" },
      };
    }

    if (!txParams.tokenAddress || !checkAddress(txParams.tokenAddress)) {
      return {
        status: 400,
        json: { error: "Invalid token contract address" },
      };
    }

    if (!txParams.sender || !checkAddress(txParams.sender)) {
      return {
        status: 400,
        json: { error: "Invalid sender address" },
      };
    }

    if (
      "senderPrivateKey" in txParams &&
      txParams.senderPrivateKey &&
      !checkPrivateKey(txParams.senderPrivateKey)
    ) {
      return {
        status: 400,
        json: { error: "Invalid sender private key" },
      };
    }

    if (!apiKeyAddress || !checkAddress(apiKeyAddress)) {
      return {
        status: 400,
        json: { error: "Invalid API key address" },
      };
    }

    if (txParams.developerFee && !(await accountExists(apiKeyAddress))) {
      return {
        status: 400,
        json: { error: "Developer address is not activated" },
      };
    }

    if ("to" in txParams && txParams.to && !checkAddress(txParams.to)) {
      return {
        status: 400,
        json: { error: "Invalid to address" },
      };
    }

    if (
      "offerAddress" in txParams &&
      txParams.offerAddress &&
      !checkAddress(txParams.offerAddress)
    ) {
      return {
        status: 400,
        json: { error: "Invalid offer address" },
      };
    }

    if (
      "bidAddress" in txParams &&
      txParams.bidAddress &&
      !checkAddress(txParams.bidAddress)
    ) {
      return {
        status: 400,
        json: { error: "Invalid bid address" },
      };
    }

    if (txType === "token:transfer" && (!("to" in txParams) || !txParams.to)) {
      return {
        status: 400,
        json: { error: "To address is required for transfer" },
      };
    }

    if (txType === "token:mint" && (!("to" in txParams) || !txParams.to)) {
      return {
        status: 400,
        json: { error: "To address is required for mint" },
      };
    }

    if ("amount" in txParams && txParams.amount && txParams.amount <= 0) {
      return {
        status: 400,
        json: { error: "Invalid amount" },
      };
    }

    if (txParams.memo && typeof txParams.memo !== "string") {
      return {
        status: 400,
        json: { error: "Invalid memo" },
      };
    }

    if (
      txParams.memo &&
      typeof txParams.memo === "string" &&
      txParams.memo.length > 30
    ) {
      return {
        status: 400,
        json: { error: "Memo is too long" },
      };
    }

    const sender = PublicKey.fromBase58(txParams.sender);

    const symbolResponse = await getTokenSymbolAndAdmin({
      tokenAddress: txParams.tokenAddress,
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

    const fee = 100_000_000;
    const tokenAddress = PublicKey.fromBase58(txParams.tokenAddress);
    if (DEBUG) console.log("Contract", tokenAddress.toBase58());
    const adminContractPublicKey = PublicKey.fromBase58(adminContractAddress);
    if (DEBUG) console.log("Admin Contract", adminContractPublicKey.toBase58());
    const wallet = PublicKey.fromBase58(WALLET);

    const amount =
      "amount" in txParams && txParams.amount
        ? UInt64.from(txParams.amount)
        : UInt64.from(0);
    const price =
      "price" in txParams && txParams.price
        ? UInt64.from(txParams.price)
        : undefined;
    const developerFee =
      "developerFee" in txParams && txParams.developerFee
        ? UInt64.from(txParams.developerFee)
        : undefined;
    const developerFeeAddress = PublicKey.fromBase58(apiKeyAddress);

    if (DEBUG) console.log("amount:", amount.toBigInt());

    const tokenId = TokenId.derive(tokenAddress);

    const action =
      {
        "token:mint": "mint",
        "token:burn": "burn",
        "token:redeem": "redeem",
        "token:transfer": "transfer",
        "token:airdrop": "airdrop",
        "token:offer:create": "offer",
        "token:bid:create": "bid",
        "token:admin:whitelist": "whitelist",
        "token:bid:sell": "sell",
        "token:bid:whitelist": "whitelist",
        "token:bid:withdraw": "withdraw",
        "token:offer:buy": "buy",
        "token:offer:whitelist": "whitelist",
        "token:offer:withdraw": "withdraw",
        "": "process",
      }[txType ?? ""] || "process";

    const memo =
      txParams.memo ??
      `${action} ${Number(amount.toBigInt()) / 1_000_000_000} ${symbol}`
        .length > 30
        ? `${action} ${symbol}`.substring(0, 30)
        : `${action} ${Number(amount.toBigInt()) / 1_000_000_000} ${symbol}`;
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
      if ("to" in txParams && txParams.to)
        await fetchMinaAccount({
          publicKey: PublicKey.fromBase58(txParams.to),
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

    if (txType === "token:transfer" || txType === "token:offer:create") {
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
      "to" in txParams && txParams.to
        ? Mina.hasAccount(PublicKey.fromBase58(txParams.to), tokenId) === false
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
    let offerPrivateKey: string | undefined =
      "offerPrivateKey" in txParams ? txParams.offerPrivateKey : undefined;
    let offerAddress: string | undefined =
      "offerAddress" in txParams ? txParams.offerAddress : undefined;
    if (txType === "token:offer:create") {
      if (!offerPrivateKey) {
        offerPrivateKey = PrivateKey.random().toBase58();
        offerAddress = PrivateKey.fromBase58(offerPrivateKey)
          .toPublicKey()
          .toBase58();
      }
      (txParams as TokenOfferTransactionParams).offerPrivateKey =
        offerPrivateKey;
      (txParams as TokenOfferTransactionParams).offerAddress = offerAddress;

      if (!offerAddress) {
        return {
          status: 400,
          json: { error: "Invalid offer address" },
        };
      }

      if (
        PrivateKey.fromBase58(offerPrivateKey).toPublicKey().toBase58() !==
        PublicKey.fromBase58(offerAddress).toBase58()
      )
        return {
          status: 400,
          json: { error: "Invalid offer private key" },
        };
    }

    let bidPrivateKey: string | undefined =
      "bidPrivateKey" in txParams ? txParams.bidPrivateKey : undefined;
    let bidAddress: string | undefined =
      "bidAddress" in txParams ? txParams.bidAddress : undefined;
    if (txType === "token:bid:create") {
      if (!bidPrivateKey) {
        bidPrivateKey = PrivateKey.random().toBase58();
        bidAddress = PrivateKey.fromBase58(bidPrivateKey)
          .toPublicKey()
          .toBase58();
      }
      (txParams as TokenBidTransactionParams).bidPrivateKey = bidPrivateKey;
      (txParams as TokenBidTransactionParams).bidAddress = bidAddress;

      if (!bidAddress) {
        return {
          status: 400,
          json: { error: "Invalid bid address" },
        };
      }

      if (
        PrivateKey.fromBase58(bidPrivateKey).toPublicKey().toBase58() !==
        PublicKey.fromBase58(bidAddress).toBase58()
      )
        return {
          status: 400,
          json: { error: "Invalid bid private key" },
        };
    }

    txParams.nonce =
      "nonce" in txParams && txParams.nonce
        ? txParams.nonce
        : await getAccountNonce(sender.toBase58());
    txParams.txType = txType;

    if (DEBUG) console.log("building tx", txParams);
    const { tx, request } = await buildTokenTransaction({
      chain,
      args: txParams,
      developerAddress: apiKeyAddress,
      provingKey: wallet.toBase58(),
      provingFee: TRANSACTION_FEE,
    });
    const signers: string[] = [];
    if (txType === "token:offer:create" && offerPrivateKey)
      signers.push(offerPrivateKey);

    if (txType === "token:bid:create" && bidPrivateKey)
      signers.push(bidPrivateKey);

    if ("senderPrivateKey" in txParams && txParams.senderPrivateKey)
      signers.push(txParams.senderPrivateKey);

    if (signers.length > 0)
      tx.sign(signers.map((s) => PrivateKey.fromBase58(s)));
    const payloads = createTransactionPayloads(tx);

    return {
      status: 200,
      json: {
        ...payloads,
        symbol,
        request: {
          ...request,
          txType,
        } as TokenTransaction["request"],
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
