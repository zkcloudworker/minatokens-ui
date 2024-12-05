"use client";
import type { TokenState } from "@/lib/token";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getChainId } from "@/lib/chain";
import { explorerAccountUrl, explorerTokenUrl } from "@/lib/chain";
const chainId = getChainId();

export const contracts = [
  {
    id: 1,
    action: "Token Contract",
    tab: "token",
    svgPath: `M14 20v2H2v-2h12zM14.586.686l7.778 7.778L20.95 9.88l-1.06-.354L17.413 12l5.657 5.657-1.414 1.414L16 13.414l-2.404 2.404.283 1.132-1.415 1.414-7.778-7.778 1.415-1.414 1.13.282 6.294-6.293-.353-1.06L14.586.686zm.707 3.536l-7.071 7.07 3.535 3.536 7.071-7.07-3.535-3.536z`,
  },
  {
    id: 2,
    action: "Admin Contract",
    tab: "admin",
    svgPath: `M16.05 12.05L21 17l-4.95 4.95-1.414-1.414 2.536-2.537L4 18v-2h13.172l-2.536-2.536 1.414-1.414zm-8.1-10l1.414 1.414L6.828 6 20 6v2H6.828l2.536 2.536L7.95 11.95 3 7l4.95-4.95z`,
  },
  {
    id: 3,
    action: "Owner",
    tab: "owner",
    svgPath: `M6.5 2h11a1 1 0 0 1 .8.4L21 6v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6l2.7-3.6a1 1 0 0 1 .8-.4zM19 8H5v12h14V8zm-.5-2L17 4H7L5.5 6h13zM9 10v2a3 3 0 0 0 6 0v-2h2v2a5 5 0 0 1-10 0v-2h2z`,
  },
];

export function TokenStateTab({ tokenState }: { tokenState: TokenState }) {
  const [tab, setTab] = useState<string>("token");

  return (
    <div className="rounded-t-2lg rounded-b-2lg rounded-tl-none border border-jacarta-100 bg-white p-6 dark:border-jacarta-600 dark:bg-jacarta-700 md:p-10">
      <div className="flex flex-wrap mb-6">
        {contracts.map((elm, i) => (
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
      {tab !== "owner" && (
        <>
          <div className="mb-2 flex items-center">
            <span className="mr-2 min-w-[14rem] dark:text-jacarta-300">
              Contract Address:
            </span>
            <Link
              href={`${explorerAccountUrl()}${tokenState.tokenAddress}`}
              className=" text-accent hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {tab === "token"
                ? tokenState.tokenAddress
                : tokenState.adminContractAddress}
            </Link>
          </div>
          {tab === "token" && (
            <>
              <div className="mb-2 flex items-center">
                <span className="mr-2 min-w-[14rem] dark:text-jacarta-300">
                  Token ID:
                </span>
                <Link
                  href={`${explorerTokenUrl()}${tokenState.tokenId}`}
                  className=" text-accent hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {tokenState.tokenId}
                </Link>
              </div>
              <div className="mb-2 flex items-center">
                <span className="mr-2 min-w-[14rem] dark:text-jacarta-300">
                  Token Symbol:
                </span>
                <span className="text-jacarta-700 dark:text-white">
                  {tab === "token"
                    ? tokenState.tokenSymbol
                    : tokenState.adminTokenSymbol}
                </span>
              </div>

              <div className="mb-2 flex items-center">
                <span className="mr-2 min-w-[14rem] dark:text-jacarta-300">
                  Total Supply:
                </span>
                <span className="text-jacarta-700 dark:text-white">
                  {tokenState.totalSupply.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 9,
                  })}
                </span>
              </div>

              <div className="mb-2 flex items-center">
                <span className="mr-2 min-w-[14rem] dark:text-jacarta-300">
                  Decimals:
                </span>
                <span className="text-jacarta-700 dark:text-white">
                  {tokenState.decimals}
                </span>
              </div>
              <div className="mb-2 flex items-center">
                <span className="mr-2 min-w-[14rem] dark:text-jacarta-300">
                  Paused:
                </span>
                <span className="text-jacarta-700 dark:text-white">
                  {tokenState.isPaused ? "Yes" : "No"}
                </span>
              </div>
            </>
          )}
          <div className="mb-2 flex items-center">
            <span className="mr-2 min-w-[14rem] dark:text-jacarta-300">
              URI:
            </span>
            <Link
              href={tab === "token" ? tokenState.uri : tokenState.adminUri}
              className=" text-accent hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {tab === "token" ? tokenState.uri : tokenState.adminUri}
            </Link>
          </div>
          <div className="mb-2 flex items-center">
            <span className="mr-2 min-w-[14rem] dark:text-jacarta-300">
              Verification Key Hash:
            </span>
            <span className="text-jacarta-700 dark:text-white">
              {tab === "token"
                ? tokenState.verificationKeyHash
                : tokenState.adminVerificationKeyHash}
            </span>
          </div>
          <div className="mb-2 flex items-center">
            <span className="mr-2 min-w-[14rem] dark:text-jacarta-300">
              Contract Version:
            </span>
            <span className="text-jacarta-700 dark:text-white">
              {tab === "token" ? tokenState.version : tokenState.adminVersion}
            </span>
          </div>

          <div className="flex items-center">
            <span className="mr-2 min-w-[14rem] dark:text-jacarta-300">
              Chain ID:
            </span>
            <span className="text-jacarta-700 dark:text-white">{chainId}</span>
          </div>
        </>
      )}
      {tab === "owner" && (
        <>
          <div className="mb-2 flex items-center">
            <span className="mr-2 min-w-[14rem] dark:text-jacarta-300">
              Owner Address:
            </span>
            <Link
              href={`${explorerAccountUrl()}${tokenState.adminAddress}`}
              className=" text-accent hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {tokenState.adminAddress}
            </Link>
          </div>
          <div className="mb-2 flex items-center">
            <span className="mr-2 min-w-[14rem] dark:text-jacarta-300">
              Owner Token Balance:
            </span>
            <span className="text-jacarta-700 dark:text-white">
              {(tokenState.adminTokenBalance / 1_000_000_000).toLocaleString(
                undefined,
                {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 9,
                }
              )}
            </span>
          </div>
          <div className="flex items-center">
            <span className="mr-2 min-w-[14rem] dark:text-jacarta-300">
              Chain ID:
            </span>
            <span className="text-jacarta-700 dark:text-white">{chainId}</span>
          </div>
        </>
      )}
    </div>
  );
}
