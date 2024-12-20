"use client";
import type { TokenState } from "@/lib/token";
import Link from "next/link";
import { useContext, useEffect, useState, useCallback } from "react";
import { getChainId } from "@/lib/chain";
import { explorerAccountUrl, explorerTokenUrl } from "@/lib/chain";
import { NotImplemented } from "./NotImplemented";
import { ContactAuthorized } from "./ContactAuthorized";
import { TokenActionComponent } from "./TokenAction";
import { TokenStateTabLoading } from "./TokenStateLoading";
import { AddressContext } from "@/context/address";
import { balance } from "@/lib/api/info/token-info";
import { debug } from "@/lib/debug";
const DEBUG = debug();
const chainId = getChainId();

function formatBalance(num: number | undefined): string {
  if (num === undefined) return "0";
  const fixed = num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return fixed.endsWith(".00") ? fixed.slice(0, fixed.length - 3) : fixed;
}

export const actions_types = {
  actions: [
    {
      id: 1,
      action: "Mint",
      tab: "mint",
      svgPath: `M16.05 12.05L21 17l-4.95 4.95-1.414-1.414 2.536-2.537L4 18v-2h13.172l-2.536-2.536 1.414-1.414zm-8.1-10l1.414 1.414L6.828 6 20 6v2H6.828l2.536 2.536L7.95 11.95 3 7l4.95-4.95z`,
    },
    {
      id: 2,
      action: "Transfer",
      tab: "transfer",
      svgPath: `M14 20v2H2v-2h12zM14.586.686l7.778 7.778L20.95 9.88l-1.06-.354L17.413 12l5.657 5.657-1.414 1.414L16 13.414l-2.404 2.404.283 1.132-1.415 1.414-7.778-7.778 1.415-1.414 1.13.282 6.294-6.293-.353-1.06L14.586.686zm.707 3.536l-7.071 7.07 3.535 3.536 7.071-7.07-3.535-3.536z`,
    },
    {
      id: 3,
      action: "Airdrop",
      tab: "airdrop",
      svgPath: `M16.05 12.05L21 17l-4.95 4.95-1.414-1.414 2.536-2.537L4 18v-2h13.172l-2.536-2.536 1.414-1.414zm-8.1-10l1.414 1.414L6.828 6 20 6v2H6.828l2.536 2.536L7.95 11.95 3 7l4.95-4.95z`,
    },
    {
      id: 4,
      action: "Burn",
      tab: "burn",
      svgPath: `M16.05 12.05L21 17l-4.95 4.95-1.414-1.414 2.536-2.537L4 18v-2h13.172l-2.536-2.536 1.414-1.414zm-8.1-10l1.414 1.414L6.828 6 20 6v2H6.828l2.536 2.536L7.95 11.95 3 7l4.95-4.95z`,
    },
  ],
  administrative_actions: [
    {
      id: 5,
      action: "Pause",
      tab: "pause",
      svgPath: `M6.5 2h11a1 1 0 0 1 .8.4L21 6v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6l2.7-3.6a1 1 0 0 1 .8-.4zM19 8H5v12h14V8zm-.5-2L17 4H7L5.5 6h13zM9 10v2a3 3 0 0 0 6 0v-2h2v2a5 5 0 0 1-10 0v-2h2z`,
    },
    {
      id: 6,
      action: "Resume",
      tab: "resume",
      svgPath: `M6.5 2h11a1 1 0 0 1 .8.4L21 6v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6l2.7-3.6a1 1 0 0 1 .8-.4zM19 8H5v12h14V8zm-.5-2L17 4H7L5.5 6h13zM9 10v2a3 3 0 0 0 6 0v-2h2v2a5 5 0 0 1-10 0v-2h2z`,
    },
    {
      id: 7,
      action: "Change Admin Contract",
      tab: "changeAdminContract",
      svgPath: `M6.5 2h11a1 1 0 0 1 .8.4L21 6v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6l2.7-3.6a1 1 0 0 1 .8-.4zM19 8H5v12h14V8zm-.5-2L17 4H7L5.5 6h13zM9 10v2a3 3 0 0 0 6 0v-2h2v2a5 5 0 0 1-10 0v-2h2z`,
    },
    {
      id: 8,
      action: "Update Admin Whitelist",
      tab: "updateAdminWhitelist",
      svgPath: `M6.5 2h11a1 1 0 0 1 .8.4L21 6v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6l2.7-3.6a1 1 0 0 1 .8-.4zM19 8H5v12h14V8zm-.5-2L17 4H7L5.5 6h13zM9 10v2a3 3 0 0 0 6 0v-2h2v2a5 5 0 0 1-10 0v-2h2z`,
    },
    {
      id: 9,
      action: "Update Offer Whitelist",
      tab: "updateOfferWhitelist",
      svgPath: `M6.5 2h11a1 1 0 0 1 .8.4L21 6v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6l2.7-3.6a1 1 0 0 1 .8-.4zM19 8H5v12h14V8zm-.5-2L17 4H7L5.5 6h13zM9 10v2a3 3 0 0 0 6 0v-2h2v2a5 5 0 0 1-10 0v-2h2z`,
    },
    {
      id: 10,
      action: "Update Bid Whitelist",
      tab: "updateBidWhitelist",
      svgPath: `M6.5 2h11a1 1 0 0 1 .8.4L21 6v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6l2.7-3.6a1 1 0 0 1 .8-.4zM19 8H5v12h14V8zm-.5-2L17 4H7L5.5 6h13zM9 10v2a3 3 0 0 0 6 0v-2h2v2a5 5 0 0 1-10 0v-2h2z`,
    },
  ],
  trade_actions: [
    {
      id: 11,
      action: "Orderbook",
      tab: "orderbook",
      svgPath: `M6.5 2h11a1 1 0 0 1 .8.4L21 6v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6l2.7-3.6a1 1 0 0 1 .8-.4zM19 8H5v12h14V8zm-.5-2L17 4H7L5.5 6h13zM9 10v2a3 3 0 0 0 6 0v-2h2v2a5 5 0 0 1-10 0v-2h2z`,
    },
    {
      id: 14,
      action: "Offer",
      tab: "offer",
      svgPath: `M6.5 2h11a1 1 0 0 1 .8.4L21 6v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6l2.7-3.6a1 1 0 0 1 .8-.4zM19 8H5v12h14V8zm-.5-2L17 4H7L5.5 6h13zM9 10v2a3 3 0 0 0 6 0v-2h2v2a5 5 0 0 1-10 0v-2h2z`,
    },
    {
      id: 15,
      action: "Bid",
      tab: "bid",
      svgPath: `M6.5 2h11a1 1 0 0 1 .8.4L21 6v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6l2.7-3.6a1 1 0 0 1 .8-.4zM19 8H5v12h14V8zm-.5-2L17 4H7L5.5 6h13zM9 10v2a3 3 0 0 0 6 0v-2h2v2a5 5 0 0 1-10 0v-2h2z`,
    },
    {
      id: 16,
      action: "Withdraw",
      tab: "withdraw",
      svgPath: `M6.5 2h11a1 1 0 0 1 .8.4L21 6v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6l2.7-3.6a1 1 0 0 1 .8-.4zM19 8H5v12h14V8zm-.5-2L17 4H7L5.5 6h13zM9 10v2a3 3 0 0 0 6 0v-2h2v2a5 5 0 0 1-10 0v-2h2z`,
    },
  ],
};

export type TokenActionsTabProps = {
  tokenState: TokenState | undefined;
  tokenSymbol: string;
  tokenAddress: string;
  decimals: number;
  actions: "actions" | "administrative_actions" | "trade_actions";
};

export function TokenActionsTab({
  tokenState,
  tokenAddress,
  tokenSymbol,
  decimals,
  actions,
}: TokenActionsTabProps) {
  const [tab, setTab] = useState<string>(actions_types[actions][0].tab);
  const { address, setAddress } = useContext(AddressContext);
  const [tokenBalance, setTokenBalance] = useState<number | undefined>(
    undefined
  );
  const [minaBalance, setMinaBalance] = useState<number | undefined>(undefined);

  const symbol = tokenState?.tokenSymbol ?? tokenSymbol ?? "tokens";

  const fetchBalance = useCallback(async () => {
    if (DEBUG) console.log("fetchBalance", address);
    if (!address) {
      setTokenBalance(undefined);
      setMinaBalance(undefined);
      return;
    }

    const tokenBalance = await balance({
      params: { address, tokenAddress },
      name: "info:balance",
      apiKeyAddress: "",
    });
    console.log(tokenBalance);
    if (tokenBalance.status === 200 && tokenBalance.json.balance !== null) {
      setTokenBalance(tokenBalance.json.balance / 10 ** decimals);
    } else {
      setTokenBalance(undefined);
    }

    const minaBalance = await balance({
      params: { address },
      name: "info:balance",
      apiKeyAddress: "",
    });
    if (minaBalance.status === 200 && minaBalance.json.balance !== null) {
      setMinaBalance(minaBalance.json.balance / 10 ** 9);
    } else {
      setMinaBalance(undefined);
    }
    if (DEBUG) console.log("fetchBalance done", { minaBalance, tokenBalance });
  }, [address, tokenAddress, tokenState, setTokenBalance, setMinaBalance]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return (
    <div className="rounded-t-2lg rounded-b-2lg rounded-tl-none border border-jacarta-100 bg-white dark:border-jacarta-600 dark:bg-jacarta-700">
      <div className="border border-b-0 border-jacarta-100 bg-light-base px-4 pt-5 pb-2.5 dark:border-jacarta-600 dark:bg-jacarta-700">
        <div className="flex flex-wrap">
          <div className="flex flex-col">
            <div>
              {actions_types[actions].map((elm, i) => (
                <button
                  key={i}
                  onClick={() => setTab(elm.tab)}
                  className={
                    tab === elm.tab
                      ? "mr-2.5 mb-2.5 inline-flex items-center rounded-xl border border-transparent bg-accent px-4 py-3 hover:bg-accent-dark dark:hover:bg-accent-dark fill-white"
                      : "group mr-2.5 mb-2.5 inline-flex items-center rounded-xl border border-jacarta-100 bg-white px-4 py-3 hover:border-transparent hover:bg-accent hover:text-white dark:border-jacarta-600 dark:bg-jacarta-700 dark:text-white dark:hover:border-transparent dark:hover:bg-accent hover:fill-white dark:fill-white "
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    className={`mr-2 h-4 w-4  `}
                  >
                    <path fill="none" d="M0 0h24v24H0z"></path>
                    <path d={elm.svgPath}></path>
                  </svg>
                  <span
                    className={`text-2xs font-medium ${
                      tab === elm.tab ? "text-white" : ""
                    } `}
                  >
                    {elm.action}
                  </span>
                </button>
              ))}
            </div>
            {actions !== "administrative_actions" && (
              <>
                <div className="mt-2 ml-6">
                  <span className="min-w-[14rem] dark:text-jacarta-300">
                    <p className="text-2x dark:text-jacarta-200 md:text-left">
                      Contact{" "}
                      <Link
                        href="/authorized"
                        className="text-accent hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Authorized Developers
                      </Link>{" "}
                      to enable the trading and transfers for your token on
                      mainnet
                    </p>
                  </span>
                </div>
                {(tokenBalance !== undefined || minaBalance !== undefined) && (
                  <div className="ml-6 text-2x mt-2 dark:text-jacarta-200 md:text-left">
                    Your balance: {formatBalance(tokenBalance)} {symbol} and{" "}
                    {formatBalance(minaBalance)} MINA
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 md:p-10">
        {(tab === "mint" ||
          tab === "transfer" ||
          tab === "airdrop" ||
          tab === "offer" ||
          tab === "orderbook" ||
          tab === "bid" ||
          tab === "withdraw") && (
          <>
            <TokenActionComponent
              key={"tokenActionComponent-" + tokenAddress + tab}
              tokenAddress={tokenAddress}
              tokenState={tokenState}
              symbol={symbol}
              decimals={decimals}
              tab={tab}
              onBalanceUpdate={fetchBalance}
            />
          </>
        )}

        {tab !== "mint" &&
          tab !== "transfer" &&
          tab !== "airdrop" &&
          tab !== "offer" &&
          tab !== "orderbook" &&
          tab !== "withdraw" &&
          tab !== "bid" && <ContactAuthorized />}
      </div>
    </div>
  );
}
