import type { TokenState } from "@/lib/token";
import Link from "next/link";
import { getChainId } from "@/lib/chain";
import { explorerAccountUrl, explorerTokenUrl } from "@/lib/chain";
const chainId = getChainId();

export function TokenStateTab({ tokenState }: { tokenState: TokenState }) {
  return (
    <div className="rounded-t-2lg rounded-b-2lg rounded-tl-none border border-jacarta-100 bg-white p-6 dark:border-jacarta-600 dark:bg-jacarta-700 md:p-10">
      <div className="mb-2 flex items-center">
        <span className="mr-2 min-w-[14rem] dark:text-jacarta-300">
          Token Symbol:
        </span>
        <span className="text-jacarta-700 dark:text-white">
          {tokenState.tokenSymbol}
        </span>
      </div>
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
          {tokenState.tokenAddress}
        </Link>
      </div>
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
          Admin Contract Address:
        </span>
        <Link
          href={`${explorerAccountUrl()}${tokenState.adminContractAddress}`}
          className=" text-accent hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {tokenState.adminContractAddress}
        </Link>
      </div>
      <div className="mb-2 flex items-center">
        <span className="mr-2 min-w-[14rem] dark:text-jacarta-300">
          Admin Address:
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
          Total Supply:
        </span>
        <span className="text-jacarta-700 dark:text-white">
          {(tokenState.totalSupply / 1_000_000_000).toLocaleString(undefined, {
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
      <div className="mb-2 flex items-center">
        <span className="mr-2 min-w-[14rem] dark:text-jacarta-300">
          Token URI:
        </span>
        <Link
          href={tokenState.uri}
          className=" text-accent hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {tokenState.uri}
        </Link>
      </div>
      <div className="mb-2 flex items-center">
        <span className="mr-2 min-w-[14rem] dark:text-jacarta-300">
          Token Verification Key Hash:
        </span>
        <span className="text-jacarta-700 dark:text-white">
          {tokenState.verificationKeyHash}
        </span>
      </div>
      <div className="mb-2 flex items-center">
        <span className="mr-2 min-w-[14rem] dark:text-jacarta-300">
          Token Contract Version:
        </span>
        <span className="text-jacarta-700 dark:text-white">
          {tokenState.version}
        </span>
      </div>
      <div className="mb-2 flex items-center">
        <span className="mr-2 min-w-[14rem] dark:text-jacarta-300">
          Admin Verification Key Hash:
        </span>
        <span className="text-jacarta-700 dark:text-white">
          {tokenState.adminVerificationKeyHash}
        </span>
      </div>
      <div className="mb-2 flex items-center">
        <span className="mr-2 min-w-[14rem] dark:text-jacarta-300">
          Admin Contract Version:
        </span>
        <span className="text-jacarta-700 dark:text-white">
          {tokenState.adminVersion}
        </span>
      </div>
      <div className="flex items-center">
        <span className="mr-2 min-w-[14rem] dark:text-jacarta-300">
          Chain ID:
        </span>
        <span className="text-jacarta-700 dark:text-white">{chainId}</span>
      </div>
    </div>
  );
}
