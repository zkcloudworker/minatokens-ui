"use client";

import confetti from "canvas-confetti";
import {
  TokenState,
  MintAddress,
  MintAddressVerified,
  TokenAction,
} from "@/lib/token";
import { checkMintData } from "@/lib/address";
import {
  explorerAccountUrl,
  explorerTokenUrl,
  getChain,
  getChainId,
  getLaunchpadUrl,
} from "@/lib/chain";
import { getWalletInfo } from "@/lib/wallet";
import { getSystemInfo } from "@/lib/system-info";
import { debug } from "@/lib/debug";
import { sleep } from "@/lib/sleep";
import { tokenTransaction } from "../../../launch/lib/transaction";
import {
  TimeLineItem,
  TimelineGroup,
  TimelineGroupStatus,
  IsErrorFunction,
  TimelineItemStatus,
} from "../../../launch/TimeLine";
import {
  messages,
  LineId,
  GroupId,
  UpdateTimelineItemFunction,
} from "../../../launch/lib/messages";
import { loadLib } from "../../../launch/lib/libraries";
import { getAccountNonce } from "@/lib/nonce";
import {
  waitForProveJob,
  waitForContractVerification,
} from "../../../launch/lib/mina-tx";
const chain = getChain();
const DEBUG = debug();

interface UpdateRequest {
  groupId: string;
  update: TimeLineItem;
}
let updateRequests: UpdateRequest[] = [];
let processRequests = false;

async function startProcessUpdateRequests(
  updateTimeLineItemInternal: UpdateTimelineItemFunction
) {
  updateRequests = [];
  processRequests = true;
  while (processRequests) {
    if (updateRequests.length > 0) {
      const request = updateRequests.shift();
      if (request) {
        updateTimeLineItemInternal(request);
      }
    }
    await sleep(1000);
  }
}

async function stopProcessUpdateRequests() {
  while (updateRequests.length > 0) {
    await sleep(1000);
  }
  processRequests = false;
}

type TokenActionStatistics = { [key in TimelineItemStatus]: number };
let statistics: {
  [key: string]: { [key in TokenAction]: TokenActionStatistics };
} = {};

export function getActionStatistics(params: {
  tokenAddress: string;
  action: TokenAction;
}): TokenActionStatistics {
  const result = statistics[params.tokenAddress]?.[params.action] || {
    success: 0,
    error: 0,
    waiting: 0,
  };
  if (DEBUG) console.log("getActionStatistics result", { params, result });
  return result;
}

export function setActionStatistics(params: {
  tokenAddress: string;
  action: TokenAction;
  statistics: TokenActionStatistics;
}) {
  if (DEBUG) console.log("setActionStatistics", params);
  const { tokenAddress, action } = params;
  if (!statistics[tokenAddress]) {
    statistics[tokenAddress] = {} as {
      [key in TokenAction]: TokenActionStatistics;
    };
  }
  statistics[tokenAddress][action] = params.statistics;
}

export async function tokenAction(params: {
  tokenState: TokenState;
  mintAddresses: MintAddress[];
  addLog: (item: TimelineGroup) => void;
  updateTimelineItem: UpdateTimelineItemFunction;
  isError: IsErrorFunction;
  action: TokenAction;
}) {
  const {
    tokenState,
    mintAddresses,
    addLog,
    updateTimelineItem: updateTimeLineItemInternal,
    isError,
    action,
  } = params;
  const {
    tokenId,
    adminAddress,
    adminContractAddress,
    tokenSymbol: symbol,
    tokenAddress,
  } = tokenState;

  startProcessUpdateRequests(updateTimeLineItemInternal);

  function updateTimelineItem(params: {
    groupId: string;
    update: TimeLineItem;
  }): void {
    const { groupId, update } = params;
    if (["o1js", "txSigned"].includes(update.lineId))
      updateTimeLineItemInternal({ groupId, update });
    else updateRequests.push({ groupId, update });
  }

  let isMintedShown = false;
  let isWaitingShown = false;
  let isErrorShown = false;

  function showStatistics(
    tokensToProcess: number,
    action: TokenAction
  ): boolean {
    const statistics = getActionStatistics({
      tokenAddress,
      action,
    });
    if (DEBUG) console.log("showStatistics", { params, statistics });
    if (statistics.success > 0 || isMintedShown) {
      if (DEBUG) console.log("showStatistics update", isMintedShown);
      updateTimelineItem({
        groupId: "mint",
        update: {
          lineId: "minted",
          content: `${action[0].toUpperCase() + action.slice(1)}ed ${
            statistics.success
          } ${symbol} tokens to ${statistics.success} addresses`,
          status:
            statistics.success === tokensToProcess ? "success" : "waiting",
        },
      });
      isMintedShown = true;
    }
    if (statistics.error > 0 || isErrorShown) {
      updateTimelineItem({
        groupId: "mint",
        update: {
          lineId: "notMinted",
          content: `${action[0].toUpperCase() + action.slice(1)} failed for ${
            statistics.error
          } addresses`,
          status: "error",
        },
      });
      updateTimelineItem({
        groupId: "mint",
        update: {
          lineId: "error",
          content: `Please make sure that you put right nonce in Auro wallet`,
          status: "error",
        },
      });
      isErrorShown = true;
    }
    if (statistics.waiting > 0 || isWaitingShown) {
      updateTimelineItem({
        groupId: "mint",
        update: {
          lineId: "waitToMint",
          content:
            statistics.waiting === 0
              ? `Processed all ${action} transactions`
              : `Processing ${action} transactions for ${statistics.waiting} addresses`,
          status: statistics.waiting === 0 ? "success" : "waiting",
        },
      });
      isWaitingShown = true;
    }
    return statistics.success === tokensToProcess;
  }

  try {
    if (DEBUG) console.log("mintTokens token:", tokenState, mintAddresses);
    let minted = 0;
    let tokensToProcess = mintAddresses.length;

    const mintingTokensMsg = (
      <>
        {action[0].toUpperCase() + action.slice(1)}ing{" "}
        <a
          href={`${explorerTokenUrl()}/${tokenId}`}
          className="text-accent hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {symbol}
        </a>{" "}
        tokens to {tokensToProcess} addresses...
      </>
    );
    addLog({
      groupId: "mint",
      status: "waiting",
      title: `${action[0].toUpperCase() + action.slice(1)}ing ${symbol} tokens`,
      successTitle: `${symbol} tokens ${action}ed`,
      errorTitle: `Failed to ${action} ${symbol} tokens`,
      lines: [
        {
          lineId: "mintingTokens",
          content: mintingTokensMsg,
          status: "waiting",
        },
      ],
      requiredForSuccess: ["mintingTokens", "minted", "o1js"],
      keepOnTop: true,
    });
    const walletInfo = await getWalletInfo();
    if (DEBUG) console.log("launchToken: Wallet Info:", walletInfo);
    const systemInfo = await getSystemInfo();
    if (DEBUG) console.log("launchToken: System Info:", systemInfo);
    const adminPublicKey = walletInfo.address;
    if (!adminPublicKey) {
      updateTimelineItem({
        groupId: "mint",
        update: messages.adminRequired,
      });
      updateTimelineItem({
        groupId: "mint",
        update: {
          lineId: "verifyData",
          content: "Data verification failed",
          status: "error",
        },
      });
      return;
    }
    if (adminPublicKey !== walletInfo.address) {
      updateTimelineItem({
        groupId: "mint",
        update: {
          lineId: "adminRequired",
          content: messages.adminAddressDoNotMatch.content,
          status: "error",
        },
      });
      updateTimelineItem({
        groupId: "mint",
        update: {
          lineId: "verifyData",
          content: "Data verification failed",
          status: "error",
        },
      });
      return;
    }
    if (isError()) return;
    const mina = (window as any).mina;
    if (mina === undefined || mina?.isAuro !== true) {
      updateTimelineItem({
        groupId: "mint",
        update: {
          lineId: "noAuroWallet",
          content: messages.noAuroWallet.content,
          status: "error",
        },
      });
      updateTimelineItem({
        groupId: "mint",
        update: {
          lineId: "verifyData",
          content: "Data verification failed",
          status: "error",
        },
      });
      return;
    }
    if (isError()) return;

    const mintItems: MintAddressVerified[] = [];
    if (DEBUG) console.log("Mint addresses:", mintAddresses);
    for (const item of mintAddresses) {
      if (item.amount === "" || item.address === "") {
        if (DEBUG) console.log("Empty mint item skipped:", item);
      } else {
        const verified = await checkMintData(item);
        if (verified !== undefined) {
          if (DEBUG) console.log("Mint item verified:", verified, item);
          mintItems.push(verified);
        } else {
          if (DEBUG) console.log("Mint item skipped:", item);
          updateTimelineItem({
            groupId: "mint",
            update: {
              lineId: "mintDataError",
              content: `Cannot ${action} ${item.amount} ${symbol} tokens to ${item.address} because of wrong amount or address`,
              status: "error",
            },
          });
          updateTimelineItem({
            groupId: "mint",
            update: {
              lineId: "verifyData",
              content: "Data verification failed",
              status: "error",
            },
          });
          return;
        }
      }
    }
    if (DEBUG) console.log("Mint items filtered:", mintItems);
    if (isError()) return;

    updateTimelineItem({
      groupId: "mint",
      update: {
        lineId: "verifyData",
        content: `${
          action[0].toUpperCase() + action.slice(1)
        } addresses are verified`,
        status: "success",
      },
    });
    updateTimelineItem({
      groupId: "mint",
      update: messages.o1js,
    });
    const libPromise = loadLib(updateTimelineItem, "mint");

    let nonce = await getAccountNonce(adminPublicKey);
    let mintPromises: Promise<boolean>[] = [];
    const lib = await libPromise;

    for (let i = 0; i < mintItems.length; i++) {
      const item = mintItems[i];
      const groupId = `minting-${symbol}-${i}`;
      const amountMsg = (
        <>
          Amount: {item.amount}{" "}
          <a
            href={`${explorerTokenUrl()}${tokenId}`}
            className="text-accent hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {symbol}
          </a>{" "}
          tokens
        </>
      );
      const tokenAddressMsg = (
        <>
          Address:{" "}
          <a
            href={`${explorerAccountUrl()}${item.address}`}
            className="text-accent hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {item.address}
          </a>
        </>
      );
      addLog({
        groupId,
        status: "waiting",
        title: `${action[0].toUpperCase() + action.slice(1)}ing ${
          item.amount
        } ${symbol} tokens`,
        successTitle: `${item.amount} ${symbol} tokens ${action}ed`,
        errorTitle: `Failed to ${action} ${item.amount} ${symbol} tokens`,
        lines: [
          messages.txMint,
          {
            lineId: "amount",
            content: amountMsg,
            status: "success",
          },
          {
            lineId: "address",
            content: tokenAddressMsg,
            status: "success",
          },
        ],
        requiredForSuccess: [
          "txMint",
          "txSigned",
          "txProved",
          "txSent",
          "txIncluded",
          "mintBalance",
        ],
      });

      const mintResult = await tokenTransaction({
        tokenPublicKey: tokenAddress,
        adminContractPublicKey: adminContractAddress,
        adminPublicKey,
        to: item.address,
        amount: item.amount,
        nonce: nonce++,
        groupId,
        updateTimelineItem,
        symbol,
        lib,

        action,
      });
      if (mintResult.success === false || mintResult.jobId === undefined) {
        return;
      }
      const mintJobId = mintResult.jobId;
      await sleep(1000);
      showStatistics(tokensToProcess, action);
      await sleep(1000);
      const waitForMintJobPromise = waitForProveJob({
        jobId: mintJobId,
        groupId,
        updateTimelineItem,

        type: "mint",
        tokenContractAddress: tokenAddress,
        address: item.address,
      });
      mintPromises.push(waitForMintJobPromise);
      if (isError()) return;
    }
    while (!showStatistics(tokensToProcess, action) && !isError()) {
      await sleep(5000);
    }

    await Promise.all(mintPromises);
    const statistics = getActionStatistics({
      tokenAddress,
      action,
    });
    const mintedTokensMsg = (
      <>
        Successfully minted{" "}
        <a
          href={`${explorerTokenUrl()}${tokenId}`}
          className="text-accent hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {symbol}
        </a>{" "}
        tokens to {statistics.success} addresses
      </>
    );
    updateTimelineItem({
      groupId: "mint",
      update: {
        lineId: "mintingTokens",
        content: mintedTokensMsg,
        status: statistics.success === tokensToProcess ? "success" : "error",
      },
    });

    const duration = 10 * 1000; // 10 seconds
    const end = Date.now() + duration;

    const interval = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval);
        return;
      }

      confetti({
        particleCount: 100,
        startVelocity: 30,
        spread: 360,
        origin: {
          x: Math.random(), // Random horizontal position
          y: Math.random() - 0.2, // Random vertical position
        },
      });
    }, 250); // Fire confetti every 250 milliseconds
    await stopProcessUpdateRequests();
  } catch (error) {
    console.error(`tokenAction catch: ${action}`, error);
    addLog({
      groupId: "error",
      status: "error",
      title: `Error ${action}ing token`,
      lines: [
        {
          lineId: "error",
          content: String(error),
          status: "error",
        },
      ],
    });
    await stopProcessUpdateRequests();
  }
}
