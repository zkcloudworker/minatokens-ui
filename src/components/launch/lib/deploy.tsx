"use client";

import { getAccountNonce } from "@/lib/nonce";
import {
  UpdateTimelineItemFunction,
  LineId,
  GroupId,
  messages,
} from "./messages";
import type { Libraries } from "@/lib/libraries";
import { debug } from "@/lib/debug";
import { getChain, getWallet } from "@/lib/chain";
import { proveTransactions } from "@/lib/token-api";
import { log } from "@/lib/log";
const DEBUG = debug();
const chain = getChain();

const WALLET = getWallet();
const AURO_TEST = process.env.NEXT_PUBLIC_AURO_TEST === "true";
const ISSUE_FEE = 1e9;

export async function deployToken(params: {
  tokenPrivateKey: string;
  adminContractPrivateKey: string;
  adminPublicKey: string;
  symbol: string;
  uri: string;
  libraries: Libraries;
  updateTimelineItem: UpdateTimelineItemFunction;
  groupId: GroupId;
}): Promise<{
  success: boolean;
  error?: string;
  jobId?: string;
}> {
  console.time("ready to sign");
  const {
    tokenPrivateKey,
    adminPublicKey,
    symbol,
    uri,
    libraries,
    updateTimelineItem,
    groupId,
  } = params;

  try {
    const mina = (window as any).mina;
    if (mina === undefined || mina?.isAuro !== true) {
      log.error("deployToken: no Auro Wallet found");
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
      tokens: { buildTokenDeployTransaction, LAUNCH_FEE },
      zkcloudworker: {
        createTransactionPayloads,
        initBlockchain,
        accountBalanceMina,
        fee: getFee,
        fetchMinaAccount,
      },
    } = libraries;

    let adminPrivateKey = PrivateKey.empty();
    if (AURO_TEST) {
      if (process.env.NEXT_PUBLIC_ADMIN_SK === undefined) {
        log.error("deployToken: NEXT_PUBLIC_ADMIN_SK is undefined");
        throw new Error("NEXT_PUBLIC_ADMIN_SK is undefined");
      }
      adminPrivateKey = PrivateKey.fromBase58(process.env.NEXT_PUBLIC_ADMIN_SK);
      const adminPublicKeyTmp = adminPrivateKey.toPublicKey();
      if (adminPublicKeyTmp.toBase58() !== process.env.NEXT_PUBLIC_ADMIN_PK) {
        log.error("deployToken: NEXT_PUBLIC_ADMIN_PK is invalid");
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

    const contractPrivateKey = PrivateKey.fromBase58(tokenPrivateKey);
    const contractAddress = contractPrivateKey.toPublicKey();
    if (DEBUG) console.log("Contract", contractAddress.toBase58());
    const adminContractPrivateKey = PrivateKey.fromBase58(
      params.adminContractPrivateKey
    );
    const adminContractPublicKey = adminContractPrivateKey.toPublicKey();
    if (DEBUG) console.log("Admin Contract", adminContractPublicKey.toBase58());
    const wallet = PublicKey.fromBase58(WALLET);

    console.time("prepared tx");
    const memo = `deploy token ${symbol}`.substring(0, 30);

    await fetchMinaAccount({
      publicKey: sender,
      force: true,
    });

    if (!Mina.hasAccount(sender)) {
      log.error("deployToken: Sender does not have account");
      updateTimelineItem({
        groupId,
        update: {
          lineId: "accountNotFound",
          content: `Account ${sender.toBase58()} not activated. Please send 1 MINA to your account to activate it.`,
          status: "error",
        },
      });

      return {
        success: false,
        error: "Account of the sender is not activated",
      };
    }
    const requiredBalance = 3 + (ISSUE_FEE + fee) / 1_000_000_000;
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
        error: `Insufficient balance of the sender`,
      };
    }

    console.log("Sender balance:", await accountBalanceMina(sender));
    const nonce = await getAccountNonce(sender.toBase58());
    const decimals = 9;

    const { tx, whitelist } = await buildTokenDeployTransaction({
      adminType: "standard",
      chain,
      sender,
      fee: UInt64.from(fee),
      nonce,
      memo,
      adminContractAddress: adminContractPublicKey,
      adminAddress: sender,
      tokenAddress: contractAddress,
      uri,
      symbol,
      whitelist: undefined,
      provingKey: wallet,
      provingFee: UInt64.from(LAUNCH_FEE),
      decimals: UInt8.from(decimals),
      developerAddress: undefined,
      developerFee: undefined,
    });

    // const tx = await Mina.transaction(
    //   { sender, fee, memo, nonce },
    //   async () => {
    //     AccountUpdate.fundNewAccount(sender, 3);
    //     const provingFee = AccountUpdate.createSigned(sender);
    //     provingFee.send({
    //       to: PublicKey.fromBase58(WALLET),
    //       amount: UInt64.from(ISSUE_FEE),
    //     });
    //     await zkAdmin.deploy({ adminPublicKey: sender });
    //     zkAdmin.account.zkappUri.set(uri);
    //     await zkToken.deploy({
    //       symbol: symbol,
    //       src: uri,
    //     });
    //     await zkToken.initialize(
    //       adminContractPublicKey,
    //       UInt8.from(9), // TODO: set decimals
    //       // We can set `startPaused` to `Bool(false)` here, because we are doing an atomic deployment
    //       // If you are not deploying the admin and token contracts in the same transaction,
    //       // it is safer to start the tokens paused, and resume them only after verifying that
    //       // the admin contract has been deployed
    //       Bool(false)
    //     );
    //   }
    // );
    tx.sign(
      AURO_TEST
        ? [contractPrivateKey, adminContractPrivateKey, adminPrivateKey]
        : [contractPrivateKey, adminContractPrivateKey]
    );

    const payloads = createTransactionPayloads(tx);

    console.timeEnd("prepared tx");
    console.timeEnd("ready to sign");

    updateTimelineItem({
      groupId,
      update: {
        lineId: "txPrepared",
        content: "Token deploy transaction is built",
        status: "success",
      },
    });
    updateTimelineItem({
      groupId,
      update: messages.txSigned,
    });
    console.time("sent transaction");

    if (!AURO_TEST) {
      const txResult = await mina?.sendTransaction(payloads.walletPayload);
      if (DEBUG) console.log("Transaction result", txResult);
      payloads.signedData = txResult?.signedData;
      if (payloads.signedData === undefined) {
        if (DEBUG) console.log("No signed data");
        updateTimelineItem({
          groupId,
          update: {
            lineId: "noUserSignature",
            content: messages.noUserSignature.content,
            status: "error",
          },
        });
        log.error("deployToken: No user signature received");

        return {
          success: false,
          error: "No user signature received",
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

    const jobId = await proveTransactions([
      {
        txType: "launch",
        adminType: "standard",
        ...payloads,
        adminContractAddress: adminContractPublicKey.toBase58(),
        tokenAddress: contractAddress.toBase58(),
        sender: sender.toBase58(),
        symbol,
        uri,
        sendTransaction: false,
        developerFee: undefined,
        developerAddress: undefined,
        whitelist,
      },
    ]);

    // const jobId = await sendDeployTransaction({
    //   txType: "deploy",
    //   serializedTransaction,
    //   signedData,
    //   adminContractAddress: adminContractPublicKey.toBase58(),
    //   tokenAddress: contractAddress.toBase58(),
    //   senderAddress: sender.toBase58(),
    //   chain,
    //   symbol,
    //   uri,
    //   sendTransaction: false,
    // });
    console.timeEnd("sent transaction");
    if (DEBUG) console.log("Sent transaction, jobId", jobId);
    if (jobId === undefined) {
      log.error("deployToken: Deploy transaction prove job failed", { symbol });
      console.error("JobId is undefined");
      updateTimelineItem({
        groupId,
        update: {
          lineId: "deployTransactionProveJobFailed",
          content: messages.deployTransactionProveJobFailed.content,
          status: "error",
        },
      });
      log.error("deployToken: Deploy transaction prove job failed");
      return {
        success: false,
        error: "Deploy transaction prove job failed",
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
    console.error("Error in deployToken", error);
    log.error("deployToken: Error while deploying token", { error });
    updateTimelineItem({
      groupId,
      update: {
        lineId: "error",
        content: String(error),
        status: "error",
      },
    });
    log.error("deployToken: Error while deploying token", { error });
    return {
      success: false,
      error: "Error while deploying token",
    };
  }
}
