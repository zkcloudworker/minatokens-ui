"use client";

import React, { useEffect, useState, useContext, useRef, FC } from "react";
import { AddressContext } from "@/context/address";
import { getWalletInfo, connectWallet } from "@/lib/wallet";
import { Mainnet, Devnet, Zeko } from "@/lib/networks";
import { Chain, APIKeyCalls } from "@prisma/client";
import { getApiCalls } from "@/lib/api-calls";
import Image from "next/image";
import Pagination from "@/components/common/Pagination";
import { unavailableCountry, checkAvailability } from "@/lib/availability";
import NotAvailable from "@/components/pages/NotAvailable";

const DEBUG = process.env.NEXT_PUBLIC_DEBUG === "true";

const chains: { name: string; value: Chain | undefined }[] = [
  { name: "All Chains", value: undefined },
  { name: "Mina mainnet", value: "mina_mainnet" },
  { name: "Mina devnet", value: "mina_devnet" },
  { name: "Zeko mainnet", value: "zeko_mainnet" },
  { name: "Zeko devnet", value: "zeko_devnet" },
];

function getChainName(chain: Chain): string | undefined {
  return chains.find((c) => c.value === chain)?.name;
}
const categories = [
  "All endpoints",
  "info",
  "deploy",
  "transaction",
  "prove",
  "result",
  "tx-status",
  "faucet",
];
const timeOptions = [
  { value: "1-hour", label: "Last 1 Hour", seconds: 3600 },
  { value: "4-hours", label: "Last 4 Hours", seconds: 14400 },
  { value: "12-hours", label: "Last 12 Hours", seconds: 43200 },
  { value: "24-hours", label: "Last 24 Hours", seconds: 86400 },
  { value: "7-days", label: "Last 7 Days", seconds: 604800 },
  { value: "30-days", label: "Last 30 Days", seconds: 2592000 },
  { value: "all-time", label: "All Time", seconds: 0 },
];

function timeString(time: Date): string {
  const now = new Date();
  const diff = now.getTime() - time.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const isToday = time.toDateString() === new Date().toDateString();

  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  if (minutes < 60) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s ago`;
  }

  // For same day but more than an hour ago, show 24h time
  if (isToday) {
    return time.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // For previous days show date and time
  return time.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/*
    function getResult(json: any): string | undefined {
      switch (name) {
        case "tx-result":
          return (json as TransactionResult)?.hash;
        case "tx-status":
          return (json as TransactionStatus)?.status;
        case "faucet":
          return (json as FaucetResponse)?.hash;
        case "prove":
          return (json as JobId)?.jobId;
        default:
          return undefined;
      }
    }
*/

function explorerUrl(chain: Chain, hash: string): string {
  switch (chain) {
    case "mina_mainnet":
      return Mainnet.explorerTransactionUrl + hash;
    case "mina_devnet":
      return Devnet.explorerTransactionUrl + hash;
    case "zeko_mainnet":
      return Zeko.explorerTransactionUrl + hash; // TODO: fix after Zeko mainnet is launched
    case "zeko_devnet":
      return Zeko.explorerTransactionUrl + hash;
    default:
      return "";
  }
}

const JobStatus = [
  { name: "created", color: "blue" },
  { name: "started", color: "yellow-500" },
  { name: "finished", color: "green" },
  { name: "failed", color: "red" },
  { name: "used", color: "green" },
  { name: "restarted", color: "yellow-500" },
];

function showResult(params: {
  endpoint: string;
  chain: Chain;
  result: string | null;
  error: string | null;
}) {
  const { endpoint, chain, result, error } = params;
  if (error)
    return (
      <span className={`text-${error ? "red" : "green"}`}>
        {error ?? "None"}
      </span>
    );
  if (endpoint === "tx-status" && result)
    return (
      <span
        className={`text-${
          result === "applied"
            ? "green"
            : result === "failed"
            ? "red"
            : "yellow-500"
        }`}
      >
        {result ?? "None"}
      </span>
    );

  if (endpoint === "prove" && result)
    return (
      <span>
        <a
          href={`https://zkcloudworker.com/job/${result}`}
          className="text-accent hover:underline"
          target="_blank"
          rel="noreferrer noopener"
        >
          {result}
        </a>
      </span>
    );
  if (endpoint === "faucet" && result)
    return (
      <span>
        <a
          href={explorerUrl(chain, result)}
          className="text-accent hover:underline"
          target="_blank"
          rel="noreferrer noopener"
        >
          {result}
        </a>
      </span>
    );
  if (endpoint === "proof" && result)
    if (JobStatus.find((s) => s.name === result))
      return (
        <span
          className={`text-${JobStatus.find((s) => s.name === result)?.color}`}
        >
          {result}
        </span>
      );
    else if (result.startsWith("5J"))
      return (
        <span>
          <a
            href={explorerUrl(chain, result)}
            className="text-accent hover:underline"
            target="_blank"
            rel="noreferrer noopener"
          >
            {result}
          </a>
        </span>
      );
    else
      return (
        <span className="text-sm font-medium tracking-tight">{result}</span>
      );
  if (result && typeof result === "string")
    return <span className="text-sm font-medium tracking-tight">{result}</span>;
  return <span></span>;
}

const maxResponseTimeMs = [
  { endpoint: "info", max: 1000 },
  { endpoint: "deploy", max: 10000 },
  { endpoint: "transaction", max: 10000 },
  { endpoint: "nft", max: 1000 },
  { endpoint: "prove", max: 2000 },
  { endpoint: "result", max: 1000 },
  { endpoint: "tx-status", max: 3000 },
  { endpoint: "faucet", max: 1000 },
  { endpoint: "default", max: 1000 },
];

function showResponseTime(endpoint: string, responseTimeMs: number) {
  const max = maxResponseTimeMs.find((elm) => elm.endpoint === endpoint)?.max;
  if (!responseTimeMs) return "";
  const minutes = Math.floor(responseTimeMs / 60000);
  const seconds = Math.floor((responseTimeMs % 60000) / 1000);
  const ms = responseTimeMs % 1000;

  let timeStr = "";
  if (minutes > 0) timeStr += `${minutes} min `;
  if (seconds > 0) timeStr += `${seconds} sec `;
  timeStr += `${ms} ms`;

  return (
    <span
      className={responseTimeMs < (max || 1000) ? "text-green" : "text-red"}
    >
      {timeStr}
    </span>
  );
}

const initialStatusList: number[] = [200, 400, 401, 403, 429, 500, 503];

const API: React.FC = () => {
  const [activeBlockchainOption, setActiveBlockchainOption] = useState<{
    name: string;
    value: Chain | undefined;
  }>(chains[0]);
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [activeTimeOption, setActiveTimeOption] = useState(timeOptions[3]);
  const [apiCalls, setApiCalls] = useState<APIKeyCalls[]>([]);
  const [page, setPage] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<number | undefined>(
    undefined
  );
  const [statusList, setStatusList] = useState<string[]>([
    "All statuses",
    ...initialStatusList.map((elm) => elm.toString()),
  ]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const { address, setAddress } = useContext(AddressContext);
  const [isAvailable, setIsAvailable] = useState<boolean>(!unavailableCountry);
  const [userActive, setUserActive] = useState(true);
  const inactivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Set up event listeners to track user activity
  useEffect(() => {
    const handleUserActivity = () => {
      setUserActive(true);

      // Reset the inactivity timeout
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }

      inactivityTimeoutRef.current = setTimeout(() => {
        setUserActive(false);
      }, 600000); // 600,000 ms = 10 minutes
    };

    // List of events to consider as user activity
    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];

    // Add event listeners for each event
    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity);
    });

    // Start the inactivity timeout when component mounts
    inactivityTimeoutRef.current = setTimeout(() => {
      setUserActive(false);
    }, 600000);

    // Cleanup function to remove event listeners and clear timeout
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, []);

  async function openGoogleForm() {
    if (
      !process.env.NEXT_PUBLIC_GOOGLE_FORM_URL ||
      !process.env.NEXT_PUBLIC_GOOGLE_FORM_URL_PREFILLED
    ) {
      throw new Error(
        "NEXT_PUBLIC_GOOGLE_FORM_URL or NEXT_PUBLIC_GOOGLE_FORM_URL_PREFILLED is not set"
      );
    }
    const address = await getAddress();
    const url = address
      ? process.env.NEXT_PUBLIC_GOOGLE_FORM_URL_PREFILLED + address
      : process.env.NEXT_PUBLIC_GOOGLE_FORM_URL;
    window.open(url, "_blank");
  }

  const fetchApiCalls = async () => {
    const address = await getAddress(false);
    if (address) {
      const { data, totalPages } = await getApiCalls({
        address,
        chain: activeBlockchainOption?.value,
        endpoint: activeCategory === categories[0] ? undefined : activeCategory,
        timePeriod: activeTimeOption.seconds,
        page,
        itemsPerPage: 10,
      });

      // const allStatuses: string[] = [
      //   "All statuses",
      //   ...Array.from(new Set(data.map((elm) => elm.status)))
      //     .sort((a, b) => a - b)
      //     .map((elm) => elm.toString()),
      // ];
      // setStatusList(allStatuses);
      setApiCalls(data);
      setTotalPages(totalPages);
    }
  };

  useEffect(() => {
    checkAvailability().then((result) => {
      setIsAvailable(!result);
      if (result) window.location.href = "/not-available";
    });
  }, []);

  useEffect(() => {
    if (DEBUG) console.log("address", address);
    fetchApiCalls();

    // Only set up polling interval if we're on page 1 and user is active
    let interval: NodeJS.Timeout | undefined;
    if (page === 1 && userActive) {
      interval = setInterval(() => {
        fetchApiCalls();
      }, 10000);
    }

    // Clean up function will clear the interval when dependencies change
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [
    address,
    activeBlockchainOption,
    activeCategory,
    activeTimeOption,
    page,
    userActive,
  ]);

  async function getAddress(tryConnect = true): Promise<string | undefined> {
    let userAddress = address;

    userAddress = (await getWalletInfo()).address;
    if (!userAddress && tryConnect) {
      userAddress = (await connectWallet({ openLink: false })).address;
    }

    if (address !== userAddress) {
      setAddress(userAddress);
      if (DEBUG) console.log("address", userAddress);
    }
    return userAddress;
  }

  return (
    <>
      {isAvailable && (
        <section className="relative py-24">
          <picture className="pointer-events-none absolute inset-0 -z-10 dark:hidden">
            <Image
              width={1920}
              height={789}
              src="/img/gradient_light.jpg"
              alt="gradient"
              className="h-full w-full"
            />
          </picture>
          <div className="container">
            <h1 className="py-16 text-center font-display text-4xl font-medium text-jacarta-700 dark:text-white">
              Your API Requests
            </h1>

            <div className="flex items-center justify-between mb-10 gap-20">
              <p className="text-md leading-normal dark:text-jacarta-300">
                <strong>Ready to get started?</strong>
                <br />
                Explore our comprehensive API documentation at{" "}
                <a
                  href="https://docs.minatokens.com"
                  className="text-accent"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  docs.minatokens.com
                </a>{" "}
                and interact with live API endpoints. Test the{" "}
                <a
                  href="https://www.npmjs.com/package/@minatokens/api"
                  className="text-accent"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  @minatokens/api
                </a>{" "}
                library using our{" "}
                <a
                  href="https://github.com/zkcloudworker/tokens-api-example/blob/main/tests/token.test.ts"
                  className="text-accent"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  GitHub example
                </a>
                , browse proof generation jobs at{" "}
                <a
                  href="https://jobs.minatokens.com"
                  className="text-accent"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  jobs.minatokens.com
                </a>
                , and see a Next.js integration example at{" "}
                <a
                  href="https://zerocraft.minatokens.com"
                  className="text-accent"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  zerocraft.minatokens.com
                </a>
                .<br />
                <br />
                <strong>Get your API key now to begin!</strong>
              </p>

              <button
                className="h-16 min-w-[250px] flex items-center justify-center rounded-full border-2 border-jacarta-100 bg-white px-8 text-center font-semibold text-jacarta-700 transition-all hover:border-transparent hover:bg-accent hover:text-white dark:border-jacarta-600 dark:bg-jacarta-700 dark:text-white dark:hover:border-transparent dark:hover:bg-accent"
                onClick={openGoogleForm}
              >
                <span>Get API Key</span>
              </button>
            </div>

            {/* Filters */}
            <div className="mb-8 flex flex-wrap items-center justify-between">
              <div className="flex flex-wrap items-center">
                {/* Categories */}
                <div className="my-1 mr-2.5">
                  <button
                    className="dropdown-toggle group group flex h-9 items-center rounded-lg border border-jacarta-100 bg-white px-4 font-display text-sm font-semibold text-jacarta-700 transition-colors hover:border-transparent hover:bg-accent hover:text-white dark:border-jacarta-600 dark:bg-jacarta-700 dark:text-white dark:hover:bg-accent"
                    id="categoriesFilter"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                      className="mr-1 h-4 w-4 fill-jacarta-700 transition-colors group-hover:fill-white dark:fill-jacarta-100"
                    >
                      <path fill="none" d="M0 0h24v24H0z" />
                      <path d="M14 10v4h-4v-4h4zm2 0h5v4h-5v-4zm-2 11h-4v-5h4v5zm2 0v-5h5v4a1 1 0 0 1-1 1h-4zM14 3v5h-4V3h4zm2 0h4a1 1 0 0 1 1 1v4h-5V3zm-8 7v4H3v-4h5zm0 11H4a1 1 0 0 1-1-1v-4h5v5zM8 3v5H3V4a1 1 0 0 1 1-1h4z" />
                    </svg>
                    <span>{activeCategory}</span>
                  </button>
                  <div
                    className="dropdown-menu z-10 hidden min-w-[220px] whitespace-nowrap rounded-xl bg-white py-4 px-2 text-left shadow-xl dark:bg-jacarta-800"
                    aria-labelledby="categoriesFilter"
                  >
                    <ul className="flex flex-col flex-wrap">
                      {categories.map((elm, i) => (
                        <li
                          onClick={() => setActiveCategory(elm)}
                          key={i}
                          className="cursor-pointer"
                        >
                          {activeCategory == elm ? (
                            <div className="dropdown-item flex w-full items-center justify-between rounded-xl px-5 py-2 text-left font-display text-sm transition-colors hover:bg-jacarta-50 dark:text-white dark:hover:bg-jacarta-600">
                              <span className="text-jacarta-700 dark:text-white">
                                {elm}
                              </span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width="24"
                                height="24"
                                className="mb-[3px] h-4 w-4 fill-accent"
                              >
                                <path fill="none" d="M0 0h24v24H0z"></path>
                                <path d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z"></path>
                              </svg>
                            </div>
                          ) : (
                            <div className="dropdown-item flex w-full items-center rounded-xl px-5 py-2 text-left font-display text-sm transition-colors hover:bg-jacarta-50 dark:text-white dark:hover:bg-jacarta-600">
                              {elm}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Chains */}
                <div className="my-1 mr-2.5">
                  <button
                    className="dropdown-toggle group group flex h-9 items-center rounded-lg border border-jacarta-100 bg-white px-4 font-display text-sm font-semibold text-jacarta-700 transition-colors hover:border-transparent hover:bg-accent hover:text-white dark:border-jacarta-600 dark:bg-jacarta-700 dark:text-white dark:hover:bg-accent"
                    id="blockchainFilter"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                      className="mr-1 h-4 w-4 fill-jacarta-700 transition-colors group-hover:fill-white dark:fill-jacarta-100"
                    >
                      <path fill="none" d="M0 0h24v24H0z" />
                      <path d="M20 16h2v6h-6v-2H8v2H2v-6h2V8H2V2h6v2h8V2h6v6h-2v8zm-2 0V8h-2V6H8v2H6v8h2v2h8v-2h2zM4 4v2h2V4H4zm0 14v2h2v-2H4zM18 4v2h2V4h-2zm0 14v2h2v-2h-2z" />
                    </svg>
                    <span>{activeBlockchainOption?.name ?? "All Chains"}</span>
                  </button>
                  <div
                    className="dropdown-menu z-10 hidden min-w-[220px] whitespace-nowrap rounded-xl bg-white py-4 px-2 text-left shadow-xl dark:bg-jacarta-800"
                    aria-labelledby="blockchainFilter"
                  >
                    <ul className="flex flex-col flex-wrap">
                      {chains.map((elm, i) => (
                        <li
                          onClick={() =>
                            setActiveBlockchainOption(
                              chains.find((c) => c.value === elm.value) ||
                                chains[0]
                            )
                          }
                          key={i}
                          className="cursor-pointer"
                        >
                          {activeBlockchainOption == elm ? (
                            <div className="dropdown-item flex w-full items-center justify-between rounded-xl px-5 py-2 text-left font-display text-sm transition-colors hover:bg-jacarta-50 dark:text-white dark:hover:bg-jacarta-600">
                              <span className="text-jacarta-700 dark:text-white">
                                {elm.name}
                              </span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width="24"
                                height="24"
                                className="mb-[3px] h-4 w-4 fill-accent"
                              >
                                <path fill="none" d="M0 0h24v24H0z"></path>
                                <path d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z"></path>
                              </svg>
                            </div>
                          ) : (
                            <div className="dropdown-item flex w-full items-center rounded-xl px-5 py-2 text-left font-display text-sm transition-colors hover:bg-jacarta-50 dark:text-white dark:hover:bg-jacarta-600">
                              {elm.name}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="dropdown relative cursor-pointer ml-2">
                  <button
                    className="dropdown-toggle group inline-flex items-center justify-between rounded-lg border border-jacarta-100 bg-white py-2 px-3 text-sm hover:border-transparent hover:bg-accent hover:text-white dark:border-jacarta-600 dark:bg-jacarta-700 dark:text-white dark:hover:border-transparent dark:hover:bg-accent"
                    id="statusFilter"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                      className="mr-1 h-4 w-4 fill-jacarta-700 transition-colors group-hover:fill-white dark:fill-jacarta-100"
                    >
                      <path fill="none" d="M0 0h24v24H0z" />
                      <path d="M13 10h5l-6 6-6-6h5V3h2v7zm-9 9h16v-7h2v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-8h2v7z" />
                    </svg>
                    <span>
                      {statusFilter ? `Status ${statusFilter}` : "All statuses"}
                    </span>
                  </button>
                  <div
                    className="dropdown-menu z-10 hidden min-w-[220px] whitespace-nowrap rounded-xl bg-white py-4 px-2 text-left shadow-xl dark:bg-jacarta-800"
                    aria-labelledby="statusFilter"
                  >
                    <ul className="flex flex-col flex-wrap">
                      {statusList.map((status, i) => (
                        <li
                          onClick={() => {
                            setStatusFilter(
                              status === "All statuses"
                                ? undefined
                                : parseInt(status)
                            );
                          }}
                          key={i}
                          className="cursor-pointer"
                        >
                          {(statusFilter === undefined &&
                            status === "All statuses") ||
                          (statusFilter !== undefined &&
                            status === statusFilter.toString()) ? (
                            <div className="dropdown-item flex w-full items-center justify-between rounded-xl px-5 py-2 text-left font-display text-sm transition-colors hover:bg-jacarta-50 dark:text-white dark:hover:bg-jacarta-600">
                              <span>{status}</span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width="24"
                                height="24"
                                className="mb-[3px] h-4 w-4 fill-accent"
                              >
                                <path fill="none" d="M0 0h24v24H0z"></path>
                                <path d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z"></path>
                              </svg>
                            </div>
                          ) : (
                            <div className="dropdown-item flex w-full items-center rounded-xl px-5 py-2 text-left font-display text-sm transition-colors hover:bg-jacarta-50 dark:text-white dark:hover:bg-jacarta-600">
                              {status}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 my-1">
                <button
                  onClick={() => {
                    fetchApiCalls();
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-jacarta-100 bg-white hover:border-transparent hover:bg-accent hover:text-white dark:border-jacarta-600 dark:bg-jacarta-700 dark:text-white dark:hover:border-transparent dark:hover:bg-accent"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    className="h-4 w-4 fill-jacarta-700 group-hover:fill-white dark:fill-jacarta-100"
                  >
                    <path fill="none" d="M0 0h24v24H0z" />
                    <path d="M5.463 4.433A9.961 9.961 0 0 1 12 2c5.523 0 10 4.477 10 10 0 2.136-.67 4.116-1.81 5.74L17 12h3A8 8 0 0 0 6.46 6.228l-.997-1.795zm13.074 15.134A9.961 9.961 0 0 1 12 22C6.477 22 2 17.523 2 12c0-2.136.67-4.116 1.81-5.74L7 12H4a8 8 0 0 0 13.54 5.772l.997 1.795z" />
                  </svg>
                </button>

                <div className="dropdown relative cursor-pointer">
                  <div
                    className="dropdown-toggle inline-flex w-48 items-center justify-between rounded-lg border border-jacarta-100 bg-white py-2 px-3 text-sm dark:border-jacarta-600 dark:bg-jacarta-700 dark:text-white"
                    role="button"
                    id="sortOrdering"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <span className="font-display">
                      {activeTimeOption.label}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                      className="h-4 w-4 fill-jacarta-500 dark:fill-white"
                    >
                      <path fill="none" d="M0 0h24v24H0z" />
                      <path d="M12 13.172l4.95-4.95 1.414 1.414L12 16 5.636 9.636 7.05 8.222z" />
                    </svg>
                  </div>

                  <div
                    className="dropdown-menu z-10 hidden w-full whitespace-nowrap rounded-xl bg-white py-4 px-2 text-left shadow-xl dark:bg-jacarta-800"
                    aria-labelledby="sortOrdering"
                  >
                    {timeOptions.map((elm, i) => (
                      <button
                        onClick={() => setActiveTimeOption(elm)}
                        key={i}
                        className={
                          activeTimeOption == elm
                            ? "dropdown-item flex w-full items-center justify-between rounded-xl px-5 py-2 text-left font-display text-sm text-jacarta-700 transition-colors hover:bg-jacarta-50 dark:text-white dark:hover:bg-jacarta-600"
                            : "dropdown-item flex w-full items-center justify-between rounded-xl px-5 py-2 text-left font-display text-sm transition-colors hover:bg-jacarta-50 dark:text-white dark:hover:bg-jacarta-600"
                        }
                      >
                        {elm.label}
                        {activeTimeOption == elm && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="24"
                            height="24"
                            className="mb-[3px] h-4 w-4 fill-accent"
                          >
                            <path fill="none" d="M0 0h24v24H0z" />
                            <path d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/*  */}
            </div>
            {/* end filters */}

            {/* Table */}
            <div className="scrollbar-custom overflow-x-auto">
              <div
                role="table"
                className="w-full min-w-[736px] border border-jacarta-100 bg-white text-sm dark:border-jacarta-600 dark:bg-jacarta-700 dark:text-white lg:rounded-2lg"
              >
                <div
                  className="flex rounded-t-2lg bg-jacarta-50 dark:bg-jacarta-600"
                  role="row"
                >
                  <div className="w-[10%] py-3 px-4" role="columnheader">
                    <span className="w-full overflow-hidden text-ellipsis text-jacarta-700 dark:text-jacarta-100">
                      Date
                    </span>
                  </div>
                  <div className="w-[15%] py-3 px-4" role="columnheader">
                    <span className="w-full overflow-hidden text-ellipsis text-jacarta-700 dark:text-jacarta-100">
                      Endpoint
                    </span>
                  </div>
                  <div className="w-[10%] py-3 px-4" role="columnheader">
                    <span className="w-full overflow-hidden text-ellipsis text-jacarta-700 dark:text-jacarta-100">
                      Chain
                    </span>
                  </div>
                  <div className="w-[5%] py-3 px-4" role="columnheader">
                    <span className="w-full overflow-hidden text-ellipsis text-jacarta-700 dark:text-jacarta-100">
                      Status
                    </span>
                  </div>
                  <div className="w-[15%] py-3 px-4" role="columnheader">
                    <span className="w-full overflow-hidden text-ellipsis text-jacarta-700 dark:text-jacarta-100">
                      Response Time
                    </span>
                  </div>
                  <div className="w-[45%] py-3 px-4" role="columnheader">
                    <span className="w-full overflow-hidden text-ellipsis text-jacarta-700 dark:text-jacarta-100">
                      Result
                    </span>
                  </div>
                </div>

                {apiCalls
                  .filter(
                    (elm) =>
                      !statusFilter || elm.status === Number(statusFilter)
                  )
                  .map((elm, i) => (
                    <div key={i} className="flex">
                      <div
                        className="flex w-[10%] items-center whitespace-nowrap border-t border-jacarta-100 py-4 px-4 dark:border-jacarta-600"
                        role="cell"
                      >
                        <span className="text-sm font-medium tracking-tight">
                          {timeString(elm.time)}
                        </span>
                      </div>
                      <div
                        className="flex w-[15%] items-center whitespace-nowrap border-t border-jacarta-100 py-4 px-4 dark:border-jacarta-600"
                        role="cell"
                      >
                        <span className="text-sm font-medium tracking-tight">
                          {elm.endpoint}
                        </span>
                      </div>
                      <div
                        className="flex w-[10%] items-center border-t border-jacarta-100 py-4 px-4 dark:border-jacarta-600"
                        role="cell"
                      >
                        <span className="text-sm font-medium tracking-tight">
                          {getChainName(elm.chain)}
                        </span>
                      </div>
                      <div
                        className="flex w-[5%] items-center border-t border-jacarta-100 py-4 px-4 dark:border-jacarta-600"
                        role="cell"
                      >
                        <span
                          className={`text-${
                            elm.status === 200 ? "green" : "red"
                          }`}
                        >
                          {elm.status}
                        </span>
                      </div>
                      <div
                        className="flex w-[15%] items-center border-t border-jacarta-100 py-4 px-4 dark:border-jacarta-600"
                        role="cell"
                      >
                        {showResponseTime(elm.endpoint, elm.responseTimeMs)}
                      </div>
                      <div
                        className="flex w-[45%] items-center border-t border-jacarta-100 py-4 px-4 dark:border-jacarta-600"
                        role="cell"
                      >
                        {showResult({
                          endpoint: elm.endpoint,
                          chain: elm.chain,
                          result: elm.result,
                          error: elm.error,
                        })}
                      </div>
                    </div>
                  ))}
              </div>
              <Pagination
                page={page}
                setPage={setPage}
                totalPages={totalPages}
              />
            </div>
          </div>
        </section>
      )}
      {!isAvailable && <NotAvailable />}
    </>
  );
};

export default API;
