"use client";
import confetti from "canvas-confetti";
import {
  TokenState,
  MintAddress,
  MintAddressVerified,
  TokenAction,
  TokenActionData,
} from "@/lib/token";
import { TokenActionStatistics, transactionStore } from "@/context/action";
import { TokenActionFormData } from "@/context/action";
import { checkMintData } from "@/lib/address";
import {
  explorerAccountUrl,
  explorerTokenUrl,
  getChain,
  getChainId,
  getLaunchpadUrl,
} from "@/lib/chain";
import { getWalletInfo } from "@/lib/wallet";
import { debug } from "@/lib/debug";
import { sleep } from "@/lib/sleep";
import { apiTokenTransaction } from "../../../launch/lib/api-transaction";
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
import { getAccountNonce } from "@/lib/nonce";
import { waitForProveJob } from "../../../launch/lib/mina-tx";
import { log } from "@/lib/log";
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

export function getActionStatistics(params: {
  tokenAddress: string;
  tab: TokenAction;
}): TokenActionStatistics {
  if (!transactionStore) return { success: 0, error: 0, waiting: 0 };
  const store = transactionStore;
  const currentState = store.getState()?.transactionStates;
  console.log("getActionStatistics currentState", currentState);
  const result = currentState?.[params.tokenAddress]?.[params.tab]
    ?.statistics || {
    success: 0,
    error: 0,
    waiting: 0,
  };
  if (DEBUG) console.log("getActionStatistics result", { params, result });
  return result;
}

export async function tokenAction(params: {
  tokenState: TokenState;
  tokenData: TokenActionData;
  tab: TokenAction;
}) {
  const { tokenState, tokenData, tab } = params;
  const { tokenId, tokenSymbol: symbol, tokenAddress } = tokenState;
  const { txs } = tokenData;
  if (DEBUG) console.log("tokenAction start", { tokenAddress, tab, tokenData });

  function updateTimeLineItemInternal(params: {
    groupId: string;
    update: TimeLineItem;
  }) {
    const { groupId, update } = params;
    if (!transactionStore) return;
    const store = transactionStore;
    const currentState = store.getState();
    currentState.updateTimelineItem({
      tokenAddress,
      tab,
      groupId,
      update,
    });
  }

  function isError(): boolean {
    if (!transactionStore) return false;
    const store = transactionStore;
    const currentState = store.getState();
    return (
      currentState.transactionStates[tokenAddress]?.[tab]?.isErrorNow ?? false
    );
  }

  function addLog(timelineGroup: TimelineGroup) {
    if (!transactionStore) return;
    const store = transactionStore;
    const currentState = store.getState();
    currentState.addTimelineGroup({
      tokenAddress,
      tab,
      timelineGroup,
    });
  }
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

  let isProcessedShown = false;
  let isWaitingShown = false;
  let isErrorShown = false;

  function showStatistics(txsToProcess: number, tab: TokenAction): boolean {
    const newStatistics = getActionStatistics({
      tokenAddress,
      tab,
    });
    if (DEBUG) console.log("showStatistics", { params, newStatistics });
    if (newStatistics.success > 0 || isProcessedShown) {
      if (DEBUG) console.log("showStatistics update", isProcessedShown);
      updateTimelineItem({
        groupId: "mint",
        update: {
          lineId: "minted",
          content: `Processed ${newStatistics.success} ${tab} ${symbol} transactions`,
          status:
            newStatistics.success === txsToProcess ? "success" : "waiting",
        },
      });
      isProcessedShown = true;
    }
    if (newStatistics.error > 0 || isErrorShown) {
      updateTimelineItem({
        groupId: "mint",
        update: {
          lineId: "notMinted",
          content: `${tab[0].toUpperCase() + tab.slice(1)} failed for ${
            newStatistics.error
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
    if (newStatistics.waiting > 0 || isWaitingShown) {
      updateTimelineItem({
        groupId: "mint",
        update: {
          lineId: "waitToMint",
          content:
            newStatistics.waiting === 0
              ? `Processed all ${tab} transactions`
              : `Processing ${newStatistics.waiting} ${tab} transactions`,
          status: newStatistics.waiting === 0 ? "success" : "waiting",
        },
      });
      isWaitingShown = true;
    }
    return newStatistics.success === txsToProcess;
  }

  try {
    if (DEBUG) console.log("tokenAction:", tokenState, tokenData);
    let txsToProcess = txs.length;

    const buildingMsg = (
      <>
        Building {txsToProcess}{" "}
        <a
          href={`${explorerTokenUrl()}/${tokenId}`}
          className="text-accent hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {symbol}
        </a>{" "}
        transactions...
      </>
    );

    addLog({
      groupId: "mint",
      status: "waiting",
      title: `Processing ${symbol} transactions`,
      successTitle: `Processed ${symbol} transactions`,
      errorTitle: `Failed to process ${symbol} transactions`,
      lines: [
        {
          lineId: "build",
          content: buildingMsg,
          status: "waiting",
        },
      ],
      requiredForSuccess: ["build", "minted"],
      keepOnTop: true,
    });
    const walletInfo = await getWalletInfo();
    if (DEBUG) console.log("launchToken: Wallet Info:", walletInfo);
    const senderAddress = walletInfo.address;
    if (DEBUG) console.log("senderAddress", senderAddress);
    if (!senderAddress) {
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
    // TODO: check admin address in case of mint with standard admin
    // if (adminPublicKey !== walletInfo.address) {
    //   updateTimelineItem({
    //     groupId: "mint",
    //     update: {
    //       lineId: "adminRequired",
    //       content: messages.adminAddressDoNotMatch.content,
    //       status: "error",
    //     },
    //   });
    //   updateTimelineItem({
    //     groupId: "mint",
    //     update: {
    //       lineId: "verifyData",
    //       content: "Data verification failed",
    //       status: "error",
    //     },
    //   });
    //   return;
    // }
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

    // const mintItems: MintAddressVerified[] = [];
    // for (const item of addresses) {
    //   if (item.amount === "" || item.address === "") {
    //     if (DEBUG) console.log("Empty mint item skipped:", item);
    //   } else {
    //     const verified = await checkMintData(item);
    //     if (verified !== undefined) {
    //       if (DEBUG) console.log("Mint item verified:", verified, item);
    //       mintItems.push(verified);
    //     } else {
    //       if (DEBUG) console.log("Mint item skipped:", item);
    //       updateTimelineItem({
    //         groupId: "mint",
    //         update: {
    //           lineId: "mintDataError",
    //           content: `Cannot ${tab} ${item.amount} ${symbol} tokens to ${item.address} because of wrong amount or address`,
    //           status: "error",
    //         },
    //       });
    //       updateTimelineItem({
    //         groupId: "mint",
    //         update: {
    //           lineId: "verifyData",
    //           content: "Data verification failed",
    //           status: "error",
    //         },
    //       });
    //       return;
    //     }
    //   }
    // }
    // if (DEBUG) console.log("Mint items filtered:", mintItems);
    // if (isError()) return;

    // updateTimelineItem({
    //   groupId: "mint",
    //   update: {
    //     lineId: "build",
    //     content: `Built ${txsToProcess} ${symbol} transactions`,
    //     status: "success",
    //   },
    // });
    // updateTimelineItem({
    //   groupId: "mint",
    //   update: messages.o1js,
    // });

    let nonce = await getAccountNonce(senderAddress);
    let txPromises: Promise<boolean>[] = [];

    for (let i = 0; i < txs.length; i++) {
      const item = txs[i];
      const groupId = `tx-${symbol}-${tab}-${i}`;
      const timeLineItems: TimeLineItem[] = [];
      if ("amount" in item) {
        const amountMsg = (
          <>
            Amount: {item.amount / 1_000_000_000}{" "}
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
        timeLineItems.push({
          lineId: "amount",
          content: amountMsg,
          status: "success",
        });
      }
      const tokenAddressMsg = (
        <>
          Address:{" "}
          <a
            href={`${explorerAccountUrl()}${item.tokenAddress}`}
            className="text-accent hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {item.tokenAddress}
          </a>
        </>
      );
      timeLineItems.push({
        lineId: "address",
        content: tokenAddressMsg,
        status: "success",
      });
      addLog({
        groupId,
        status: "waiting",
        title: `${tab[0].toUpperCase() + tab.slice(1)}ing ${symbol} tokens`,
        successTitle: `${symbol} tokens ${tab}ed`,
        errorTitle: `Failed to ${tab} ${symbol} tokens`,
        lines: [messages.txMint, ...timeLineItems],
        requiredForSuccess: ["mintBalance"],
      });

      const mintResult = await apiTokenTransaction({
        symbol: tokenData.symbol,
        updateTimelineItem,
        sender: senderAddress,
        nonce: nonce++,
        groupId,
        action: tab,
        data: item,
      });
      if (mintResult.success === false || mintResult.jobId === undefined) {
        return;
      }
      const mintJobId = mintResult.jobId;
      await sleep(1000);
      showStatistics(txsToProcess, tab);
      await sleep(1000);
      const waitForMintJobPromise = waitForProveJob({
        jobId: mintJobId,
        groupId,
        updateTimelineItem,
        type: "mint",
        tokenContractAddress: tokenAddress,
        addresses:
          item.txType === "airdrop"
            ? item.recipients.map((recipient) => recipient.address)
            : item.txType === "mint" || item.txType === "transfer"
            ? [item.to]
            : [],
      });
      txPromises.push(waitForMintJobPromise);
      if (isError()) return;
    }
    const builtMsg = (
      <>
        Built {txsToProcess}{" "}
        <a
          href={`${explorerTokenUrl()}/${tokenId}`}
          className="text-accent hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {symbol}
        </a>{" "}
        transactions.
      </>
    );
    updateTimelineItem({
      groupId: "mint",
      update: {
        lineId: "build",
        content: builtMsg,
        status: "success",
      },
    });
    // updateTimelineItem({
    //   groupId: "mint",
    //   update: {
    //     lineId: "wait",
    //     content: `Waiting for ${txsToProcess} ${symbol} transactions to be processed`,
    //     status: "waiting",
    //   },
    // });
    while (!showStatistics(txsToProcess, tab) && !isError()) {
      await sleep(5000);
    }

    await Promise.all(txPromises);
    const finalStatistics = getActionStatistics({
      tokenAddress,
      tab,
    });
    const mintedTokensMsg = (
      <>
        Successfully processed {finalStatistics.success}{" "}
        <a
          href={`${explorerTokenUrl()}${tokenId}`}
          className="text-accent hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {symbol}
        </a>{" "}
        {tab} transaction(s)
      </>
    );
    updateTimelineItem({
      groupId: "mint",
      update: {
        lineId: "minted",
        content: mintedTokensMsg,
        status: finalStatistics.success === txsToProcess ? "success" : "error",
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
    log.error(`tokenAction catch: ${tab}`, { error });
    addLog({
      groupId: "error",
      status: "error",
      title: `Error ${tab}ing token`,
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
