"use client";

import React, { useEffect, useState, useContext, FC } from "react";
import { AddressContext } from "@/context/address";
import { getWalletInfo, connectWallet } from "@/lib/wallet";
import { Chain, APIKeyCalls } from "@prisma/client";
import { getApiCalls } from "@/lib/api-calls";
const DEBUG = process.env.NEXT_PUBLIC_DEBUG === "true";

const chains: { name: string; value: Chain | undefined }[] = [
  { name: "All Chains", value: undefined },
  { name: "Mina mainnet", value: "mina_mainnet" },
  { name: "Mina devnet", value: "mina_devnet" },
  { name: "Zeko mainnet", value: "zeko_mainnet" },
  { name: "Zeko devnet", value: "zeko_devnet" },
];
function getChainId(chain: string): Chain | undefined {
  return chains.find((c) => c.name === chain)?.value;
}
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
import Image from "next/image";
import Link from "next/link";

const API: React.FC = () => {
  const [activeBlockchainOption, setActiveBlockchainOption] = useState<{
    name: string;
    value: Chain | undefined;
  }>(chains[0]);
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [activeTimeOption, setActiveTimeOption] = useState(timeOptions[3]);
  const [apiCalls, setApiCalls] = useState<APIKeyCalls[]>([]);
  const { address, setAddress } = useContext(AddressContext);

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

  useEffect(() => {
    if (DEBUG) console.log("address", address);
    const fetchItem = async () => {
      const address = await getAddress(false);
      if (address) {
        const apiCalls = await getApiCalls({
          address,
          chain: activeBlockchainOption?.value,
          endpoint:
            activeCategory === categories[0] ? undefined : activeCategory,
          timePeriod: activeTimeOption.seconds,
        });
        setApiCalls(apiCalls);
      }
    };
    fetchItem();
  }, [address, activeBlockchainOption, activeCategory, activeTimeOption]);

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
          <p className="text-lg leading-normal dark:text-jacarta-300">
            Explore our comprehensive API documentation and try out live API
            endpoints at{" "}
            <a
              href="https://minatokens.readme.io"
              className="text-accent"
              target="_blank"
              rel="noreferrer noopener"
            >
              https://minatokens.readme.io
            </a>
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
                          chains.find((c) => c.value === elm.value) || chains[0]
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
          </div>

          <div className="dropdown relative my-1 cursor-pointer">
            <div
              className="dropdown-toggle inline-flex w-48 items-center justify-between rounded-lg border border-jacarta-100 bg-white py-2 px-3 text-sm dark:border-jacarta-600 dark:bg-jacarta-700 dark:text-white"
              role="button"
              id="sortOrdering"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <span className="font-display">{activeTimeOption.label}</span>
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
              <div className="w-[15%] py-3 px-4" role="columnheader">
                <span className="w-full overflow-hidden text-ellipsis text-jacarta-700 dark:text-jacarta-100">
                  Date
                </span>
              </div>
              <div className="w-[10%] py-3 px-4" role="columnheader">
                <span className="w-full overflow-hidden text-ellipsis text-jacarta-700 dark:text-jacarta-100">
                  Endpoint
                </span>
              </div>
              <div className="w-[15%] py-3 px-4" role="columnheader">
                <span className="w-full overflow-hidden text-ellipsis text-jacarta-700 dark:text-jacarta-100">
                  Chain
                </span>
              </div>
              <div className="w-[10%] py-3 px-4" role="columnheader">
                <span className="w-full overflow-hidden text-ellipsis text-jacarta-700 dark:text-jacarta-100">
                  Status
                </span>
              </div>
              <div className="w-[55%] py-3 px-4" role="columnheader">
                <span className="w-full overflow-hidden text-ellipsis text-jacarta-700 dark:text-jacarta-100">
                  Error
                </span>
              </div>
            </div>

            {apiCalls.map((elm, i) => (
              <Link
                href={`/user/${elm.id}`}
                key={i}
                className="flex transition-shadow hover:shadow-lg"
                role="row"
              >
                <div
                  className="flex w-[15%] items-center whitespace-nowrap border-t border-jacarta-100 py-4 px-4 dark:border-jacarta-600"
                  role="cell"
                >
                  <span className="text-sm font-medium tracking-tight">
                    {`${new Date(elm.time).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}, ${new Date(elm.time).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    })}`}
                  </span>
                </div>
                <div
                  className="flex w-[10%] items-center whitespace-nowrap border-t border-jacarta-100 py-4 px-4 dark:border-jacarta-600"
                  role="cell"
                >
                  <span className="text-sm font-medium tracking-tight">
                    {elm.endpoint}
                  </span>
                </div>
                <div
                  className="flex w-[15%] items-center border-t border-jacarta-100 py-4 px-4 dark:border-jacarta-600"
                  role="cell"
                >
                  <span className="text-sm font-medium tracking-tight">
                    {getChainName(elm.chain)}
                  </span>
                </div>
                <div
                  className="flex w-[10%] items-center border-t border-jacarta-100 py-4 px-4 dark:border-jacarta-600"
                  role="cell"
                >
                  <span
                    className={`text-${elm.status === 200 ? "green" : "red"}`}
                  >
                    {elm.status}
                  </span>
                </div>
                <div
                  className="flex w-[55%] items-center border-t border-jacarta-100 py-4 px-4 dark:border-jacarta-600"
                  role="cell"
                >
                  <span className={`text-${elm.error ? "red" : "green"}`}>
                    {elm.error ?? "None"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default API;
