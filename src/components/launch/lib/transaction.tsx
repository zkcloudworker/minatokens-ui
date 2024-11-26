"use client";

import { sendTokenTransaction } from "@/lib/token-api";
import { UpdateTimelineItemFunction, messages } from "./messages";
import type { Libraries } from "@/lib/libraries";
import { debug } from "@/lib/debug";
import { getChain, getWallet } from "@/lib/chain";
import { TokenAction } from "@/lib/token";
const DEBUG = debug();
const chain = getChain();
const WALLET = getWallet();

const AURO_TEST = process.env.NEXT_PUBLIC_AURO_TEST === "true";
const MINT_FEE = 1e8;
const TRANSFER_FEE = 1e8;

export async function tokenTransaction(params: {
  tokenPublicKey: string;
  adminContractPublicKey: string;
  adminPublicKey: string;
  to: string;
  amount: number;
  symbol: string;
  lib: Libraries;
  updateTimelineItem: UpdateTimelineItemFunction;
  nonce: number;
  groupId: string;
  action: TokenAction;
}): Promise<{
  success: boolean;
  error?: string;
  jobId?: string;
}> {
  console.time("ready to sign");
  if (DEBUG) console.log(`token ${params.action}`, params);
  const {
    tokenPublicKey,
    adminPublicKey,
    symbol,
    lib,
    updateTimelineItem,
    nonce,
    groupId,
    action,
  } = params;
  const FEE = action === "mint" ? MINT_FEE : TRANSFER_FEE;
  try {
    const mina = (window as any).mina;
    if (mina === undefined || mina?.isAuro !== true) {
      throw new Error("No Auro Wallet found");
    }

    const {
      o1js: {
        PrivateKey,
        PublicKey,
        UInt64,
        Mina,
        AccountUpdate,
        UInt8,
        Bool,
        Field,
      },
      zkcloudworker: {
        FungibleToken,
        serializeTransaction,
        initBlockchain,
        accountBalanceMina,
        accountBalance,
        fee: getFee,
        fetchMinaAccount,
      },
    } = lib;

    const to = PublicKey.fromBase58(params.to);
    const amount = UInt64.from(
      Number(parseInt((params.amount * 1_000_000_000).toFixed(0)))
    );

    let adminPrivateKey = PrivateKey.empty();
    if (AURO_TEST) {
      if (process.env.NEXT_PUBLIC_ADMIN_SK === undefined) {
        throw new Error("NEXT_PUBLIC_ADMIN_SK is undefined");
      }
      adminPrivateKey = PrivateKey.fromBase58(process.env.NEXT_PUBLIC_ADMIN_SK);
      const adminPublicKeyTmp = adminPrivateKey.toPublicKey();
      if (adminPublicKeyTmp.toBase58() !== process.env.NEXT_PUBLIC_ADMIN_PK) {
        throw new Error("NEXT_PUBLIC_ADMIN_PK is invalid");
      }
    }
    const sender = AURO_TEST
      ? adminPrivateKey.toPublicKey()
      : PublicKey.fromBase58(adminPublicKey);

    if (DEBUG) console.log("initializing blockchain", chain);
    const net = await initBlockchain(chain);
    if (DEBUG) console.log("blockchain initialized", net);

    if (DEBUG) console.log("network id", Mina.getNetworkId());

    const balance = await accountBalanceMina(sender);
    const fee = Number((await getFee()).toBigInt());
    const contractAddress = PublicKey.fromBase58(tokenPublicKey);
    if (DEBUG) console.log("Contract", contractAddress.toBase58());
    const adminContractPublicKey = PublicKey.fromBase58(
      params.adminContractPublicKey
    );
    if (DEBUG) console.log("Admin Contract", adminContractPublicKey.toBase58());
    const wallet = PublicKey.fromBase58(WALLET);
    const zkToken = new FungibleToken(contractAddress);
    const tokenId = zkToken.deriveTokenId();

    if (DEBUG) console.log(`Sending tx...`);
    console.time("prepared tx");
    const memo =
      `${action} ${Number(amount.toBigInt()) / 1_000_000_000} ${symbol}`
        .length > 30
        ? `${action} ${symbol}`.substring(0, 30)
        : `${action} ${Number(amount.toBigInt()) / 1_000_000_000} ${symbol}`;

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
      console.error("Error fetching mina account", error);
    }

    if (!Mina.hasAccount(sender)) {
      console.error("Sender does not have account");

      updateTimelineItem({
        groupId,
        update: {
          lineId: "accountNotFound",
          content: `Account ${sender.toBase58()} not found. Please fund your account or try again later, after all the previous transactions are included in the block.`,
          status: "error",
        },
      });

      return {
        success: false,
        error: "Sender does not have account",
      };
    }
    const senderTokenBalance = Mina.hasAccount(sender, tokenId)
      ? Mina.getAccount(sender, tokenId).balance
      : UInt64.from(0);
    if (
      action === "transfer" &&
      senderTokenBalance.toBigInt() < amount.toBigInt()
    ) {
      console.error("Sender does not have enough tokens");

      updateTimelineItem({
        groupId,
        update: {
          lineId: "insufficientBalance",
          content: `Account ${sender.toBase58()} does not have enough tokens. Required: ${
            Number(amount.toBigInt()) / 1_000_000_000
          } ${symbol}, available: ${
            Number(senderTokenBalance.toBigInt()) / 1_000_000_000
          } ${symbol}`,
          status: "error",
        },
      });

      return {
        success: false,
        error: "Sender does not have account",
      };
    }
    const isNewAccount = Mina.hasAccount(to, tokenId) === false;
    const requiredBalance = isNewAccount ? 1 : 0 + (FEE + fee) / 1_000_000_000;
    if (requiredBalance > balance) {
      updateTimelineItem({
        groupId,
        update: {
          lineId: "insufficientBalance",
          content: `Insufficient balance of the sender: ${balance} MINA. Required: ${requiredBalance} MINA`,
          status: "error",
        },
      });
      return {
        success: false,
        error: `Insufficient balance of the sender: ${balance} MINA. Required: ${requiredBalance} MINA`,
      };
    }

    console.log("Sender balance:", await accountBalanceMina(sender));
    await sleep(1000);

    const tx = await Mina.transaction(
      { sender, fee, memo, nonce },
      async () => {
        if (isNewAccount) AccountUpdate.fundNewAccount(sender, 1);
        const provingFee = AccountUpdate.createSigned(sender);
        provingFee.send({
          to: PublicKey.fromBase58(WALLET),
          amount: UInt64.from(MINT_FEE),
        });
        if (action === "mint") await zkToken.mint(to, amount);
        else await zkToken.transfer(sender, to, amount);
      }
    );
    if (AURO_TEST) tx.sign([adminPrivateKey]);

    const serializedTransaction = serializeTransaction(tx);
    const transaction = tx.toJSON();
    const txJSON = JSON.parse(transaction);
    if (DEBUG) console.log("Transaction", tx.toPretty());
    const payload = {
      transaction,
      onlySign: true,
      nonce,
      feePayer: {
        fee: fee,
        memo: memo,
      },
    };
    console.timeEnd("prepared tx");
    console.timeEnd("ready to sign");
    await sleep(1000);
    updateTimelineItem({
      groupId,
      update: {
        lineId: "txMint",
        content: `${
          action[0].toUpperCase() + action.slice(1)
        } transaction is built`,
        status: "success",
      },
    });
    updateTimelineItem({
      groupId,
      update: {
        lineId: "txSigned",
        content: `Please sign the transaction, setting the nonce to ${nonce} in Auro Wallet advanced settings`,
        status: "waiting",
      },
    });

    console.time("sent transaction");
    if (DEBUG) console.log("txJSON", txJSON);
    let signedData = JSON.stringify({ zkappCommand: txJSON });

    if (!AURO_TEST) {
      const txResult = await mina?.sendTransaction(payload);
      if (DEBUG) console.log("Transaction result", txResult);
      signedData = txResult?.signedData;
      if (signedData === undefined) {
        if (DEBUG) console.log("No signed data");
        updateTimelineItem({
          groupId,
          update: {
            lineId: "noUserSignature",
            content:
              "No user signature received, ${action} transaction cancelled",
            status: "error",
          },
        });
        return {
          success: false,
          error: "No user signature",
        };
      }
    }

    updateTimelineItem({
      groupId,
      update: {
        lineId: "txSigned",
        content: "Transaction is signed",
        status: "success",
      },
    });
    updateTimelineItem({
      groupId,
      update: messages.txProved,
    });
    const jobId = await sendTokenTransaction({
      txType: action,
      tokenAddress: contractAddress.toBase58(),
      from: sender.toBase58(),
      to: to.toBase58(),
      amount: Number(amount.toBigInt()),
      chain,
      symbol,
      sendTransaction: false,
      serializedTransaction,
      signedData,
    });

    console.timeEnd("sent transaction");
    if (DEBUG) console.log("Sent transaction, jobId", jobId);
    if (jobId === undefined) {
      console.error("JobId is undefined");
      updateTimelineItem({
        groupId,
        update: {
          lineId: "deployTransactionProveJobFailed",
          content: messages.deployTransactionProveJobFailed.content,
          status: "error",
        },
      });

      return {
        success: false,
        error: "JobId is undefined",
      };
    }
    const jobIdMessage = (
      <>
        <a
          href={`https://zkcloudworker.com/job/${jobId}`}
          className="text-accent hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Proving
        </a>{" "}
        the transaction...
      </>
    );

    updateTimelineItem({
      groupId,
      update: {
        lineId: "txProved",
        content: jobIdMessage,
        status: "waiting",
      },
    });
    return {
      success: true,
      jobId,
    };
  } catch (error) {
    console.error("Error in mintToken", error);
    updateTimelineItem({
      groupId,
      update: {
        lineId: "error",
        content: String(error) ?? `Error while ${action}ing token`,
        status: "error",
      },
    });
    return {
      success: false,
      error: String(error) ?? `Error while ${action}ing token`,
    };
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
