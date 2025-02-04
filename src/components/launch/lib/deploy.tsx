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
import { proveTransaction } from "@/lib/token-api";
import { log } from "@/lib/log";
import {
  LaunchTokenStandardAdminParams,
  LaunchTokenBondingCurveAdminParams,
} from "@minatokens/api";
import { deployToken as deployTokenApi } from "@/lib/api/token/deploy";
const DEBUG = debug();
const chain = getChain();

const WALLET = getWallet();
const AURO_TEST = process.env.NEXT_PUBLIC_AURO_TEST === "true";
const LAUNCH_FEE = 10e9;

export async function deployToken(params: {
  tokenPrivateKey: string;
  adminContractPrivateKey: string;
  adminPublicKey: string;
  symbol: string;
  uri: string;
  libraries: Libraries;
  updateTimelineItem: UpdateTimelineItemFunction;
  groupId: GroupId;
  tokenType: "standard" | "meme";
}): Promise<{
  success: boolean;
  error?: string;
  jobId?: string;
}> {
  const {
    tokenPrivateKey,
    adminPublicKey,
    symbol,
    uri,
    libraries,
    updateTimelineItem,
    groupId,
    tokenType,
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
      abi: { buildTokenLaunchTransaction, LAUNCH_FEE },
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
    const requiredBalance = 4 + (LAUNCH_FEE + fee) / 1_000_000_000;
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

    const launchParams:
      | LaunchTokenStandardAdminParams
      | LaunchTokenBondingCurveAdminParams = {
      txType: "token:launch",
      adminContract: tokenType === "standard" ? "standard" : "bondingCurve",
      nonce,
      memo,
      adminContractAddress: adminContractPublicKey.toBase58(),
      sender: sender.toBase58(),
      tokenAddress: contractAddress.toBase58(),
      uri,
      symbol,
      decimals,
      tokenContractPrivateKey: tokenPrivateKey,
      adminContractPrivateKey: params.adminContractPrivateKey,
    };

    const launchReply = await deployTokenApi({
      params: launchParams,
      name: "token:launch",
      apiKeyAddress: sender.toBase58(),
    });
    if (launchReply.status !== 200) {
      updateTimelineItem({
        groupId,
        update: {
          lineId: "error",
          content: launchReply.json.error,
          status: "error",
        },
      });
      log.error("deployToken: Error while deploying token", {
        error: launchReply.json.error,
      });
      return {
        success: false,
        error: launchReply.json.error,
      };
    }

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
    // tx.sign(
    //   AURO_TEST
    //     ? [contractPrivateKey, adminContractPrivateKey, adminPrivateKey]
    //     : [contractPrivateKey, adminContractPrivateKey]
    // );

    // const payloads = createTransactionPayloads(tx);
    const payloads = launchReply.json;

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
    payloads.sendTransaction = false;

    const jobId = await proveTransaction(payloads);

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
