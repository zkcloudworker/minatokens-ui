"use client";
import {
  UpdateTimelineItemFunction,
  GroupId,
  LineId,
  messages,
} from "./messages";
import { getResult } from "@/lib/token-api";
import { TokenInfo, TokenAction } from "@/lib/token";
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
import { log } from "@/lib/log";
import { AccountBalance, getBalances } from "@/lib/api/info/token-info";
const chain = getChain();
const DEBUG = debug();

export async function waitForProveJob(params: {
  jobId: string;
  groupId: string;
  updateTimelineItem: UpdateTimelineItemFunction;
  type: TokenAction | "launch";
  tokenAddress: string;
  accounts: AccountBalance[];
}): Promise<boolean> {
  const { jobId, groupId, updateTimelineItem, type, tokenAddress, accounts } =
    params;
  // if (type === "mint" && !address) {
  //   log.error("waitForProveJob: Address is required for minting", {
  //     address,
  //   });
  //   throw new Error("Address is required for minting");
  // }

  await sleep(10000);
  let result = await getResult(jobId);
  let jobStatus = result?.jobStatus;
  while (
    jobStatus !== "finished" &&
    jobStatus !== "used" &&
    jobStatus !== "failed"
  ) {
    await sleep(10000);
    result = await getResult(jobId);
    jobStatus = result?.jobStatus;
  }

  if (
    jobStatus === "failed" ||
    result.success === false ||
    !result?.results ||
    result?.results[0]?.tx === undefined
  ) {
    updateTimelineItem({
      groupId,
      update: {
        lineId: "txProved",
        content: "Failed to prove transaction",
        status: "error",
      },
    });
    log.error("waitForProveJob: Transaction prove job failed", {
      result,
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

  const includedPromises: any[] = [];
  const length = result?.results?.length ?? 0;
  for (let i = 0; i < length; i++) {
    const txResult = result?.results[i];
    const transaction = txResult.tx;
    const msg = messages.txSent;
    const lineId = length > 1 ? ` ${i + 1}` : "";
    msg.lineId = "txSent" + lineId;
    updateTimelineItem({
      groupId,
      update: msg,
    });

    if (!transaction) {
      log.error("waitForProveJob: Transaction is undefined");
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
      updateTimelineItem({
        groupId,
        update: {
          lineId: "txSent" + lineId,
          content: `Cannot send transaction to Mina blockchain: ${
            sendResult.status ? "status: " + sendResult.status + ", " : ""
          } ${String(sendResult.error ?? "error D4381")}, retrying...`,
          status: "waiting",
        },
      });
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
          lineId: "txSent" + lineId,
          content: `Failed to send transaction to Mina blockchain: ${
            sendResult.status ? "status: " + sendResult.status + ", " : ""
          } ${String(sendResult.error ?? "error D437")}`,
          status: "error",
        },
      });
      log.error(
        "waitForProveJob: Failed to send transaction to Mina blockchain",
        {
          sendResult,
        }
      );
      return false;
    }
    includedPromises.push(
      waitForMinaTx({
        hash: sendResult.hash,
        groupId,
        lineId,
        updateTimelineItem,
        type,
      })
    );
  }

  // const txIncluded = await waitForMinaTx({
  //   hash: sendResult.hash,
  //   groupId,
  //   updateTimelineItem,
  //   type,
  // });

  for (const includedPromise of includedPromises) {
    if (!(await includedPromise)) {
      return false;
    }
  }

  if (type === "launch") {
    return true;
  } else {
    if (DEBUG) console.log("accounts before getBalances", accounts);
    const updatedAccounts = await getBalances({ accounts, tokenAddress });
    if (DEBUG) console.log("accounts after getBalances", updatedAccounts);
    const length = updatedAccounts.length;
    for (let i = 0; i < length; i++) {
      const account = updatedAccounts[i];
      if (account.balanceString)
        updateTimelineItem({
          groupId,
          update: {
            lineId: `balance${i === length - 1 ? "" : `-${i}`}`,
            content: account.balanceString,
            status: "success",
          },
        });
      if (account.tokenBalanceString)
        updateTimelineItem({
          groupId,
          update: {
            lineId: `tokenBalance${i === length - 1 ? "" : `-${i}`}`,
            content: account.tokenBalanceString,
            status: "success",
          },
        });
    }
    // const length = addresses?.length ?? 0;
    // for (let i = 0; i < length; i++) {
    //   if (DEBUG) console.log("checking addresses balances", addresses[i]);
    //   const address = addresses[i];
    //   if (!address) {
    //     log.error("waitForProveJob: Address is required for minting", {
    //       address,
    //     });
    //     throw new Error("Address is required for minting");
    //   }
    //   const start = Date.now();
    //   const TIMEOUT = 1000 * 60 * 30;
    //   let attempt = 1;
    //   let balanceResult = await balance(
    //     {
    //       tokenAddress: tokenAddress,
    //       address,
    //     },
    //     ""
    //   );
    //   while (
    //     (balanceResult.status !== 200 || balanceResult.json.balance === null) &&
    //     Date.now() - start < TIMEOUT
    //   ) {
    //     attempt++;
    //     balanceResult = await balance(
    //       {
    //         tokenAddress: tokenAddress,
    //         address,
    //       },
    //       ""
    //     );
    //     await sleep(5000 * attempt);
    //   }
    //   console.log(
    //     "balanceResult",
    //     balanceResult,
    //     "received in ",
    //     Date.now() - start,
    //     "ms in attempt:",
    //     attempt
    //   );
    //   if (balanceResult.status !== 200 || balanceResult.json.balance === null) {
    //     updateTimelineItem({
    //       groupId,
    //       update: {
    //         lineId: `mintBalance-${i}`,
    //         content: "Failed to get token balance",
    //         status: "error",
    //       },
    //     });
    //     log.error("waitForProveJob: Failed to get token balance", {
    //       balanceResult,
    //     });
    //     return false;
    //   }
    //   updateTimelineItem({
    //     groupId,
    //     update: {
    //       lineId: `mintBalance${i === length - 1 ? "" : `-${i}`}`,
    //       content: `Token balance of ${address} is ${
    //         balanceResult.json.balance / 1_000_000_000
    //       }`,
    //       status: "success",
    //     },
    //   });
    // }
    return true;
  }
}

export async function waitForMinaTx(params: {
  hash: string;
  groupId: string;
  lineId: string;
  updateTimelineItem: UpdateTimelineItemFunction;
  type: TokenAction | "launch";
}): Promise<boolean> {
  const { hash, groupId, lineId, updateTimelineItem, type } = params;
  const txSentMsg = (
    <>
      Transaction{lineId} is{" "}
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
      lineId: "txSent" + lineId,
      content: txSentMsg,
      status: "success",
    },
  });
  const msg = messages.txIncluded;
  msg.lineId = "txIncluded" + lineId;
  updateTimelineItem({
    groupId,
    update: msg,
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
        lineId: "txIncluded" + lineId,
        content: `Transaction${lineId} is not included in the block`,
        status: "error",
      },
    });
    log.error("waitForProveJob: Transaction is not included in the block", {
      hash,
    });
    return false;
  }
  const successSentMsg = (
    <>
      Transaction{lineId} is{" "}
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
      lineId: "txIncluded" + lineId,
      content: successSentMsg,
      status: "success",
    },
  });
  // if (
  //   type === "launch" ||
  //   type === "mint" ||
  //   type === "transfer" ||
  //   type === "offer"
  // ) {
  //   updateTimelineItem({
  //     groupId,
  //     update:
  //       type === "launch"
  //         ? messages.contractStateVerified
  //         : messages.mintBalance,
  //   });
  // }
  return true;
}

export async function waitForContractVerification(params: {
  tokenAddress: string;
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
    tokenAddress,
    adminContractAddress,
    adminAddress,
    info,
    tokenId,
  } = params;

  let count = 0;
  const timestamp = Date.now();
  let verified = false;
  try {
    verified = await verifyFungibleTokenState({
      tokenContractAddress: tokenAddress,
      adminContractAddress,
      adminAddress,
      info,
      created: timestamp,
      updated: timestamp,
      tokenId,
      rating: 100,
      status: "created",
    });
  } catch (error) {
    log.error("Error verifying token contract state", { error });
  }
  if (DEBUG)
    console.log("Waiting for contract state to be verified...", verified);
  while (!verified && count++ < 100) {
    if (DEBUG)
      console.log("Waiting for contract state to be verified...", verified);
    await sleep(10000);
    try {
      verified = await verifyFungibleTokenState({
        tokenContractAddress: tokenAddress,
        adminContractAddress,
        adminAddress,
        tokenId,
        info,
        created: timestamp,
        updated: timestamp,
        rating: 100,
        status: "created",
      });
    } catch (error) {
      log.error("Error verifying token contract state", { error });
    }
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
    log.error(
      "waitForContractVerification: Failed to verify token contract state",
      {
        verified,
      }
    );
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
