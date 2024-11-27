"use client";
import {
  UpdateTimelineItemFunction,
  GroupId,
  LineId,
  messages,
} from "./messages";
import { getResult } from "@/lib/token-api";
import { TokenInfo } from "@/lib/token";
import { getTxStatusFast } from "@/lib/txstatus-fast";
import { verifyFungibleTokenState } from "@/lib/verify";
import { sleep } from "@/lib/sleep";
import { debug } from "@/lib/debug";
import {
  getChain,
  explorerTokenUrl,
  explorerTransactionUrl,
  explorerAccountUrl,
} from "@/lib/chain";
import { sendTransaction } from "@/lib/send";
import { balance } from "@/lib/api/token-info";
const chain = getChain();
const DEBUG = debug();

export async function waitForProveJob(params: {
  jobId: string;
  groupId: string;
  updateTimelineItem: UpdateTimelineItemFunction;
  type: "deploy" | "mint";
  tokenContractAddress: string;
  address?: string;
}): Promise<boolean> {
  const {
    jobId,
    groupId,
    updateTimelineItem,
    type,
    tokenContractAddress,
    address,
  } = params;
  if (type === "mint" && !address) {
    throw new Error("Address is required for minting");
  }

  await sleep(10000);
  let result = await getResult(jobId);
  while (
    result?.tx === undefined &&
    result?.error === undefined &&
    result?.success !== false
  ) {
    await sleep(10000);
    result = await getResult(jobId);
  }

  if (result?.error || result?.tx === undefined || result?.success == false) {
    updateTimelineItem({
      groupId,
      update: {
        lineId: "txProved",
        content: result?.error ?? "Failed to prove transaction",
        status: "error",
      },
    });
    return false;
  }

  const txSuccessMsg = (
    <>
      Transaction is{" "}
      <a
        href={`https://zkcloudworker.com/job/${jobId}`}
        className="text-accent hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        proved
      </a>
    </>
  );

  updateTimelineItem({
    groupId,
    update: {
      lineId: "txProved",
      content: txSuccessMsg,
      status: "success",
    },
  });
  updateTimelineItem({
    groupId,
    update: messages.txSent,
  });

  const transaction = result.tx;

  if (DEBUG) console.log("Transaction proved:", transaction?.slice(0, 50));
  if (!transaction) {
    return false;
  }

  const start = Date.now();
  let sendResult = await sendTransaction(transaction);
  const TIMEOUT = 1000 * 60 * 30;
  let attempt = 1;
  while (
    (sendResult.success === false || sendResult.hash === undefined) &&
    Date.now() - start < TIMEOUT
  ) {
    attempt++;
    console.log(`Sending transaction (${attempt})...`, sendResult);
    await sleep(10000 * attempt);
    sendResult = await sendTransaction(transaction);
  }
  if (DEBUG)
    console.log(
      "Transaction sent:",
      sendResult,
      "in",
      attempt,
      "attempt after",
      Date.now() - start,
      "ms"
    );
  if (sendResult.success === false || sendResult.hash === undefined) {
    updateTimelineItem({
      groupId,
      update: {
        lineId: "txSent",
        content: `Failed to send transaction to Mina blockchain: ${
          sendResult.status ? "status: " + sendResult.status + ", " : ""
        } ${String(sendResult.error ?? "error D437")}`,
        status: "error",
      },
    });
    return false;
  }

  const txIncluded = await waitForMinaTx({
    hash: sendResult.hash,
    groupId,
    updateTimelineItem,
    type,
  });

  if (!txIncluded) {
    return false;
  }

  if (type === "deploy") {
    return true;
  } else {
    if (!address) {
      throw new Error("Address is required for minting");
    }
    const start = Date.now();
    const TIMEOUT = 1000 * 60 * 30;
    let attempt = 1;
    let balanceResult = await balance(
      {
        tokenAddress: tokenContractAddress,
        address,
      },
      ""
    );
    while (
      (balanceResult.status !== 200 || balanceResult.json.balance === null) &&
      Date.now() - start < TIMEOUT
    ) {
      attempt++;
      balanceResult = await balance(
        {
          tokenAddress: tokenContractAddress,
          address,
        },
        ""
      );
      await sleep(5000 * attempt);
    }
    console.log(
      "balanceResult",
      balanceResult,
      "received in ",
      Date.now() - start,
      "ms in attempt:",
      attempt
    );
    if (balanceResult.status !== 200 || balanceResult.json.balance === null) {
      updateTimelineItem({
        groupId,
        update: {
          lineId: "mintBalance",
          content: "Failed to get token balance",
          status: "error",
        },
      });
      return false;
    }
    updateTimelineItem({
      groupId,
      update: {
        lineId: "mintBalance",
        content: `Token balance of ${address} is ${
          balanceResult.json.balance / 1_000_000_000
        }`,
        status: "success",
      },
    });
    return true;
  }
}

export async function waitForMinaTx(params: {
  hash: string;
  groupId: string;
  updateTimelineItem: UpdateTimelineItemFunction;
  type: "deploy" | "mint";
}): Promise<boolean> {
  const { hash, groupId, updateTimelineItem, type } = params;
  const txSentMsg = (
    <>
      Transaction is{" "}
      <a
        href={`${explorerTransactionUrl()}${hash}`}
        className="text-accent hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        sent
      </a>
    </>
  );

  updateTimelineItem({
    groupId,
    update: {
      lineId: "txSent",
      content: txSentMsg,
      status: "success",
    },
  });
  updateTimelineItem({
    groupId,
    update: messages.txIncluded,
  });

  let delay = 10000;
  let status = await getTxStatusFast({ hash });
  let ok = status?.result ?? false;
  let count = 0;
  const TIMEOUT = 1000 * 60 * 60;
  const start = Date.now();
  if (DEBUG)
    console.log("Waiting for Mina transaction to be mined...", { hash, ok });
  while (!ok && Date.now() - start < TIMEOUT) {
    await sleep(delay);
    status = await getTxStatusFast({ hash });
    ok = status?.result ?? false;
    count++;
    if (status.error) {
      delay += 5000;
      console.error("Mina tx status error", status.error);
      console.log(`Retrying in ${delay / 1000} seconds...`);
    }
  }
  if (DEBUG) console.log("Final tx status", { ok, hash, count });
  if (!ok) {
    updateTimelineItem({
      groupId,
      update: {
        lineId: "txIncluded",
        content: "Transaction is not included in the block",
        status: "error",
      },
    });
    return false;
  }
  const successSentMsg = (
    <>
      Transaction is{" "}
      <a
        href={`${explorerTransactionUrl()}${hash}`}
        className="text-accent hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        included
      </a>{" "}
      in the block
    </>
  );

  updateTimelineItem({
    groupId,
    update: {
      lineId: "txIncluded",
      content: successSentMsg,
      status: "success",
    },
  });
  updateTimelineItem({
    groupId,
    update:
      type === "deploy" ? messages.contractStateVerified : messages.mintBalance,
  });
  return true;
}

export async function waitForContractVerification(params: {
  tokenContractAddress: string;
  adminContractAddress: string;
  adminAddress: string;
  tokenId: string;
  groupId: GroupId;
  updateTimelineItem: UpdateTimelineItemFunction;
  info: TokenInfo;
}): Promise<boolean> {
  const {
    groupId,
    updateTimelineItem,
    tokenContractAddress,
    adminContractAddress,
    adminAddress,
    info,
    tokenId,
  } = params;

  let count = 0;
  const timestamp = Date.now();
  let verified = await verifyFungibleTokenState({
    tokenContractAddress,
    adminContractAddress,
    adminAddress,
    info,
    created: timestamp,
    updated: timestamp,
    tokenId,
  });
  if (DEBUG)
    console.log("Waiting for contract state to be verified...", verified);
  while (!verified && count++ < 100) {
    if (DEBUG)
      console.log("Waiting for contract state to be verified...", verified);
    await sleep(10000);
    verified = await verifyFungibleTokenState({
      tokenContractAddress,
      adminContractAddress,
      adminAddress,
      tokenId,
      info,
      created: timestamp,
      updated: timestamp,
    });
  }
  if (DEBUG) console.log("Final status", { verified, count });
  if (!verified) {
    updateTimelineItem({
      groupId,
      update: {
        lineId: messages.contractStateVerified.lineId,
        content: "Failed to verify token contract state",
        status: "error",
      },
    });
    return false;
  }

  const tokenStateVerifiedMsg = (
    <>
      <a
        href={`${explorerTokenUrl()}${tokenId}`}
        className="text-accent hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        Token contract
      </a>{" "}
      state is verified
    </>
  );
  updateTimelineItem({
    groupId,
    update: {
      lineId: messages.contractStateVerified.lineId,
      content: tokenStateVerifiedMsg,
      status: "success",
    },
  });

  return true;
}
