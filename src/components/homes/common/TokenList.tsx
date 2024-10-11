"use client";

import { algoliaGetTokenList } from "@/lib/search";
import { DeployedTokenInfo } from "@/lib/token";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState, useContext } from "react";
import { SearchContext } from "@/context/search";
import { AddressContext } from "@/context/address";
import {
  algoliaLikesCount,
  algoliaWriteLike,
  algoliaGetUsersLikes,
} from "@/lib/likes";

import tippy from "tippy.js";
import { getWalletInfo, connectWallet } from "@/lib/wallet";
import { getTokenState } from "@/lib/state";
const DEBUG = process.env.NEXT_PUBLIC_DEBUG === "true";

/*
interface Item {
  id: number;
  imageSrc: string;
  title: string;
  likes: number;
  creatorAvatar: string;
  ownerAvatar: string;
  price: number;
  category: string;
  creator: string;
  owner: string;
  bidCount: string;
  NFSW: boolean;
  LazyMinted: boolean;
  liked?: boolean;
  varified?: boolean;
}
  */

const sortingOptions: string[] = ["Price: Low to High", "Price: High to Low"];
type categoriesTypes = "issued" | "owned" | "favorites";
interface Category {
  id: categoriesTypes;
  name: string;
  selected: boolean;
  icon: string;
}

const categoriesIndexes: Record<categoriesTypes, number> = {
  owned: 0,
  issued: 1,
  favorites: 2,
};

const initialCategories: Category[] = [
  {
    id: "owned",
    selected: false,
    name: "Tokens I own",
    icon: "M2 4a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v5.5a2.5 2.5 0 1 0 0 5V20a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4zm6.085 15a1.5 1.5 0 0 1 2.83 0H20v-2.968a4.5 4.5 0 0 1 0-8.064V5h-9.085a1.5 1.5 0 0 1-2.83 0H4v14h4.085zM9.5 11a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z",
  },
  {
    id: "issued",
    selected: false,
    name: "Tokens I issued",
    icon: "M2 4a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v5.5a2.5 2.5 0 1 0 0 5V20a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4zm6.085 15a1.5 1.5 0 0 1 2.83 0H20v-2.968a4.5 4.5 0 0 1 0-8.064V5h-9.085a1.5 1.5 0 0 1-2.83 0H4v14h4.085zM9.5 11a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z",
  },
  {
    id: "favorites",
    selected: false,
    name: "Favorites",
    icon: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  },
];

export default function TokenList() {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [items, setItems] = useState<DeployedTokenInfo[]>([]);
  const [tokensFetched, setTokensFetched] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeSort, setActiveSort] = useState<string>(sortingOptions[0]);
  const [onlyVarified, setOnlyVarified] = useState<boolean>(false);
  const [onlyNFSW, setOnlyNFSW] = useState<boolean>(false);
  const [onlyLazyMinted, setOnlyLazyMinted] = useState<boolean>(false);
  const { search } = useContext(SearchContext);
  const { address, setAddress } = useContext(AddressContext);
  useEffect(() => {
    tippy("[data-tippy-content]");
  }, []);

  /*
  const addLike = (id: number) => {
    const items = [...allItems];
    const item = items.filter((elm) => elm.id === id)[0];
    const indexToReplace = items.findIndex((item) => item.id === id);
    if (!item.liked) {
      item.liked = true;
      item.likes += 1;
      items[indexToReplace] = item;
      setAllItems(items);
    } else {
      item.liked = false;
      item.likes -= 1;
      items[indexToReplace] = item;
      setAllItems(items);
    }
  };
  */

  // TODO: save favorites to local or network storage like AWS or algolia
  const addLike = async (tokenAddress: string) => {
    setFavorites((prev) => {
      if (prev.includes(tokenAddress)) {
        return prev;
      } else {
        const index = items.findIndex(
          (elm) => elm.tokenAddress === tokenAddress
        );
        if (index !== -1) {
          items[index].likes = (items[index].likes ?? 0) + 1;
          setItems(items);
        }
        return [...prev, tokenAddress];
      }
    });
    if (address) await algoliaWriteLike({ tokenAddress, userAddress: address });
  };

  const isLiked = (tokenAddress: string) => {
    return favorites.includes(tokenAddress);
  };

  useEffect(() => {
    const fetchTokenList = async () => {
      let userAddress = address;
      let onlyFavorites = categories[categoriesIndexes.favorites].selected;
      let onlyOwned = categories[categoriesIndexes.owned].selected;
      let onlyIssued = categories[categoriesIndexes.issued].selected;
      if (userAddress === undefined) {
        userAddress = (await getWalletInfo()).address;
        if (
          userAddress === undefined &&
          (onlyFavorites || onlyOwned || onlyIssued)
        ) {
          userAddress = (await connectWallet())?.address;
          if (userAddress === undefined) {
            console.error("Cannot connect wallet");
            onlyFavorites = false;
            onlyOwned = false;
            onlyIssued = false;
            setCategories(initialCategories);
          }
        }
        if (address !== userAddress) {
          setAddress(userAddress);
          if (DEBUG) console.log("address", userAddress);
        }
      }
      let newItems: DeployedTokenInfo[] =
        (
          await algoliaGetTokenList({
            query: search,
            page: 0,
            hitsPerPage: 8, // TODO: decide how many to fetch
            favoritesOfAddress: onlyFavorites ? userAddress : undefined,
            ownedByAddress: onlyOwned ? userAddress : undefined,
            issuedByAddress: onlyIssued ? userAddress : undefined,
          })
        )?.hits ?? [];
      setItems(newItems);

      let likedTokens: string[] = [];
      if (onlyFavorites && userAddress) {
        likedTokens = newItems.map((elm) => elm.tokenAddress);
      } else if (userAddress) {
        likedTokens = await algoliaGetUsersLikes({ userAddress });
      }
      setFavorites(likedTokens);
      if (DEBUG)
        console.log("Search results:", {
          userAddress,
          categories,
          newItems,
          likedTokens,
        });

      for (const item of newItems) {
        const index = tokensFetched.findIndex(
          (elm) => elm === item.tokenAddress
        );
        if (index === -1) {
          const state = await getTokenState({
            tokenAddress: item.tokenAddress,
            info: item,
          });
          if (state.success) {
            setTokensFetched((prev) => [...prev, item.tokenAddress]);
            if (state.isStateUpdated) {
              const index = newItems.findIndex(
                (elm) => elm.tokenAddress === item.tokenAddress
              );
              if (index !== -1) {
                const newItem = newItems[index];
                Object.keys(state.tokenState).forEach((key) => {
                  (newItem as any)[key] = (state.tokenState as any)[key];
                });
                setItems((prev) => {
                  const prevItems = [...prev];
                  const index = prevItems.findIndex(
                    (elm) => elm.tokenAddress === item.tokenAddress
                  );
                  if (index !== -1) {
                    prevItems[index] = newItem;
                  }
                  return prevItems;
                });
              }
            }
          }
        }
      }
    };
    fetchTokenList();
    // if (activeCategory == "all") {
    //   tempitems = allItems;
    // } else {
    //   tempitems = allItems.filter((elm) => elm.category == activeCategory);
    // }
    // if (activeSort == "Price: Low to High") {
    //   tempitems = [...tempitems.sort((a, b) => a.price - b.price)];
    // }
    // if (activeSort == "Price: High to Low") {
    //   tempitems = [...tempitems.sort((a, b) => b.price - a.price)];
    // }
    // if (onlyVarified) {
    //   tempitems = [...tempitems.filter((elm) => elm.varified)];
    // }
    // if (onlyNFSW) {
    //   tempitems = [...tempitems.filter((elm) => elm.NFSW)];
    // }
    // if (onlyLazyMinted) {
    //   tempitems = [...tempitems.filter((elm) => elm.LazyMinted)];
    // }
  }, [categories, activeSort, onlyVarified, onlyNFSW, onlyLazyMinted, search]);

  return (
    <section className="py-32">
      <div className="container">
        <h2 className="mb-8 text-center font-display text-5xl text-jacarta-700 dark:text-white">
          <span
            className="mr-3 inline-block h-8 w-8 bg-contain bg-center text-xl"
            style={{
              backgroundImage:
                "url(https://cdn.jsdelivr.net/npm/emoji-datasource-apple@7.0.2/img/apple/64/26a1.png)",
            }}
          ></span>
          Trending
        </h2>
        <div className="mb-8 flex flex-wrap items-center justify-between">
          <ul className="flex flex-wrap items-center">
            <li className="my-1 mr-2.5">
              <div
                onClick={() => setCategories(initialCategories)}
                className={`  ${
                  categories.every((category) => category.selected === false)
                    ? "bg-jacarta-100"
                    : "bg-white"
                }  ${
                  categories.every((category) => category.selected === false)
                    ? "dark:bg-jacarta-600"
                    : "dark:bg-jacarta-900"
                } cursor-pointer group flex h-9 items-center rounded-lg border border-jacarta-100  px-4 font-display text-sm font-semibold text-jacarta-500 transition-colors hover:border-transparent hover:bg-accent hover:text-white dark:border-jacarta-600  dark:text-white dark:hover:border-transparent dark:hover:bg-accent dark:hover:text-white`}
              >
                All
              </div>
            </li>
            {categories.map((elm, i) => (
              <li
                onClick={() =>
                  setCategories((prev) => {
                    const newCategories = prev.map((category, index) => {
                      if (index === i) {
                        return { ...category, selected: !category.selected };
                      }
                      return category;
                    });
                    if (DEBUG) console.log("New categories", newCategories);
                    return newCategories;
                  })
                }
                key={i}
                className="my-1 mr-2.5"
              >
                <div
                  className={`  ${
                    categories[i].selected ? "bg-jacarta-100" : "bg-white"
                  }  ${
                    categories[i].selected
                      ? "dark:bg-jacarta-600"
                      : "dark:bg-jacarta-900"
                  } cursor-pointer group flex h-9 items-center rounded-lg border border-jacarta-100  px-4 font-display text-sm font-semibold text-jacarta-500 transition-colors hover:border-transparent hover:bg-accent hover:text-white dark:border-jacarta-600  dark:text-white dark:hover:border-transparent dark:hover:bg-accent dark:hover:text-white`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 25 28"
                    width="24"
                    height="24"
                    className="mr-1 h-4 w-4 fill-jacarta-700 transition-colors group-hover:fill-white dark:fill-jacarta-100"
                  >
                    <path fill="none" d="M0 0h24v24H0z" />
                    <path d={elm.icon} />
                  </svg>
                  <span>{elm.name}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="dropdown my-1 cursor-pointer">
            <div
              className="dropdown-toggle inline-flex w-48 items-center justify-between rounded-lg border border-jacarta-100 bg-white py-2 px-3 text-sm dark:border-jacarta-600 dark:bg-jacarta-700 dark:text-white"
              role="button"
              id="categoriesSort"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <span className="font-display">{activeSort}</span>
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
              className="dropdown-menu z-10 hidden min-w-[220px] whitespace-nowrap rounded-xl bg-white py-4 px-2 text-left shadow-xl dark:bg-jacarta-800"
              aria-labelledby="categoriesSort"
            >
              <span className="block px-5 py-2 font-display text-sm font-semibold text-jacarta-300">
                Sort By
              </span>
              {sortingOptions.map((elm, i) => (
                <button
                  onClick={() => setActiveSort(elm)}
                  key={i}
                  className={
                    activeSort == elm
                      ? "dropdown-item flex w-full items-center justify-between rounded-xl px-5 py-2 text-left font-display text-sm text-jacarta-700 transition-colors hover:bg-jacarta-50 dark:text-white dark:hover:bg-jacarta-600"
                      : "dropdown-item flex w-full items-center justify-between rounded-xl px-5 py-2 text-left font-display text-sm transition-colors hover:bg-jacarta-50 dark:text-white dark:hover:bg-jacarta-600"
                  }
                >
                  {elm}
                  {activeSort == elm && (
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
              <span className="block px-5 py-2 font-display text-sm font-semibold text-jacarta-300">
                Options
              </span>
              <div className="dropdown-item block w-full rounded-xl px-5 py-2 text-left font-display text-sm transition-colors hover:bg-jacarta-50 dark:text-white dark:hover:bg-jacarta-600">
                <span className="flex items-center justify-between">
                  <span>Verified Only</span>
                  <input
                    type="checkbox"
                    name="check"
                    checked={onlyVarified}
                    onChange={(e) => {
                      setOnlyVarified((pre) => !pre);
                    }}
                    className="relative h-4 w-7 cursor-pointer appearance-none rounded-lg border-none bg-jacarta-100 shadow-none after:absolute after:top-0.5 after:left-0.5 after:h-3 after:w-3 after:rounded-full after:bg-jacarta-400 after:transition-all checked:bg-accent checked:bg-none checked:after:left-3.5 checked:after:bg-white checked:hover:bg-accent focus:ring-transparent focus:ring-offset-0 checked:focus:bg-accent"
                  />
                </span>
              </div>
              <div className="dropdown-item block w-full rounded-xl px-5 py-2 text-left font-display text-sm transition-colors hover:bg-jacarta-50 dark:text-white dark:hover:bg-jacarta-600">
                <span className="flex items-center justify-between">
                  <span>NFSW Only</span>
                  <input
                    type="checkbox"
                    checked={onlyNFSW}
                    onChange={(e) => {
                      setOnlyNFSW((pre) => !pre);
                    }}
                    name="check"
                    className="relative h-4 w-7 cursor-pointer appearance-none rounded-lg border-none bg-jacarta-100 shadow-none after:absolute after:top-0.5 after:left-0.5 after:h-3 after:w-3 after:rounded-full after:bg-jacarta-400 after:transition-all checked:bg-accent checked:bg-none checked:after:left-3.5 checked:after:bg-white checked:hover:bg-accent focus:ring-transparent focus:ring-offset-0 checked:focus:bg-accent"
                  />
                </span>
              </div>
              <div className="dropdown-item block w-full rounded-xl px-5 py-2 text-left font-display text-sm transition-colors hover:bg-jacarta-50 dark:text-white dark:hover:bg-jacarta-600">
                <span className="flex items-center justify-between">
                  <span>Show Lazy Minted</span>
                  <input
                    type="checkbox"
                    checked={onlyLazyMinted}
                    onChange={(e) => {
                      setOnlyLazyMinted((pre) => !pre);
                    }}
                    name="check"
                    className="relative h-4 w-7 cursor-pointer appearance-none rounded-lg border-none bg-jacarta-100 shadow-none after:absolute after:top-0.5 after:left-0.5 after:h-3 after:w-3 after:rounded-full after:bg-jacarta-400 after:transition-all checked:bg-accent checked:bg-none checked:after:left-3.5 checked:after:bg-white checked:hover:bg-accent focus:ring-transparent focus:ring-offset-0 checked:focus:bg-accent"
                  />
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-[1.875rem] md:grid-cols-2 lg:grid-cols-4">
          {items.map((elm, i) => (
            <article key={i}>
              <div className="block rounded-2.5xl border border-jacarta-100 bg-white p-[1.1875rem] transition-shadow hover:shadow-lg dark:border-jacarta-700 dark:bg-jacarta-700">
                <figure className="relative">
                  <Link href={`/token/${elm.tokenAddress}`}>
                    <Image
                      width={230}
                      height={230}
                      src={elm.image ?? "launchpad.png"}
                      alt="token 5"
                      className="w-full rounded-[0.625rem]"
                      loading="lazy"
                      crossOrigin="anonymous"
                    />
                  </Link>
                  <div className="absolute top-3 right-3 flex items-center space-x-1 rounded-md bg-white p-2 dark:bg-jacarta-700">
                    <span
                      onClick={() => addLike(elm.tokenAddress)}
                      className={`js-likes relative cursor-pointer before:absolute before:h-4 before:w-4 before:bg-[url('../img/heart-fill.svg')] before:bg-cover before:bg-center before:bg-no-repeat before:opacity-0 ${
                        isLiked(elm.tokenAddress) ? "js-likes--active" : ""
                      }`}
                      data-tippy-content="Favorite"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        width="24"
                        height="24"
                        className="h-4 w-4 fill-jacarta-500 hover:fill-red dark:fill-jacarta-200 dark:hover:fill-red"
                      >
                        <path fill="none" d="M0 0H24V24H0z" />
                        <path d="M12.001 4.529c2.349-2.109 5.979-2.039 8.242.228 2.262 2.268 2.34 5.88.236 8.236l-8.48 8.492-8.478-8.492c-2.104-2.356-2.025-5.974.236-8.236 2.265-2.264 5.888-2.34 8.244-.228zm6.826 1.641c-1.5-1.502-3.92-1.563-5.49-.153l-1.335 1.198-1.336-1.197c-1.575-1.412-3.99-1.35-5.494.154-1.49 1.49-1.565 3.875-.192 5.451L12 18.654l7.02-7.03c1.374-1.577 1.299-3.959-.193-5.454z" />
                      </svg>
                    </span>
                    {/* <span className="text-sm dark:text-jacarta-200">
                      {elm.likes}
                    </span> */}
                    <span className="text-sm dark:text-jacarta-200">
                      {elm.likes ?? 0}
                    </span>
                  </div>
                </figure>
                <div className="mt-7 flex items-center justify-between">
                  <Link href={`/token/${elm.tokenAddress}`}>
                    <span className="font-display text-base text-jacarta-700 hover:text-accent dark:text-white">
                      {elm.name}
                    </span>
                  </Link>
                  <div className="dropup rounded-full hover:bg-jacarta-100 dark:hover:bg-jacarta-600">
                    <a
                      href="#"
                      className="dropdown-toggle inline-flex h-8 w-8 items-center justify-center text-sm"
                      role="button"
                      id="itemActions"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      <svg
                        width="16"
                        height="4"
                        viewBox="0 0 16 4"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="fill-jacarta-500 dark:fill-jacarta-200"
                      >
                        <circle cx="2" cy="2" r="2" />
                        <circle cx="8" cy="2" r="2" />
                        <circle cx="14" cy="2" r="2" />
                      </svg>
                    </a>
                    <div
                      className="dropdown-menu dropdown-menu-end z-10 hidden min-w-[200px] whitespace-nowrap rounded-xl bg-white py-4 px-2 text-left shadow-xl dark:bg-jacarta-800"
                      aria-labelledby="itemActions"
                    >
                      <button className="block w-full rounded-xl px-5 py-2 text-left font-display text-sm transition-colors hover:bg-jacarta-50 dark:text-white dark:hover:bg-jacarta-600">
                        New bid
                      </button>
                      <hr className="my-2 mx-4 h-px border-0 bg-jacarta-100 dark:bg-jacarta-600" />
                      <button className="block w-full rounded-xl px-5 py-2 text-left font-display text-sm transition-colors hover:bg-jacarta-50 dark:text-white dark:hover:bg-jacarta-600">
                        Refresh Metadata
                      </button>
                      <button className="block w-full rounded-xl px-5 py-2 text-left font-display text-sm transition-colors hover:bg-jacarta-50 dark:text-white dark:hover:bg-jacarta-600">
                        Share
                      </button>
                      <button className="block w-full rounded-xl px-5 py-2 text-left font-display text-sm transition-colors hover:bg-jacarta-50 dark:text-white dark:hover:bg-jacarta-600">
                        Report
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  <span className="text-jacarta-500 dark:text-jacarta-300 float-left">
                    {elm.symbol}
                  </span>
                  <span className="mr-1 text-jacarta-700 dark:text-jacarta-200 float-right">
                    {`Supply: ${elm.totalSupply / 1_000_000_000}`}
                  </span>
                  {/* <span className="text-jacarta-500 dark:text-jacarta-300">
                    {elm.bidCount}
                  </span> */}
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <button
                    className="font-display text-sm font-semibold text-accent"
                    data-bs-toggle="modal"
                    data-bs-target="#buyNowModal"
                  >
                    Buy now
                  </button>
                  <Link
                    href={`/token/${elm.tokenAddress}`}
                    className="group flex items-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                      className="mr-1 mb-[3px] h-4 w-4 fill-jacarta-500 group-hover:fill-accent dark:fill-jacarta-200"
                    >
                      <path fill="none" d="M0 0H24V24H0z" />
                      <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12h2c0 4.418 3.582 8 8 8s8-3.582 8-8-3.582-8-8-8C9.25 4 6.824 5.387 5.385 7.5H8v2H2v-6h2V6c1.824-2.43 4.729-4 8-4zm1 5v4.585l3.243 3.243-1.415 1.415L11 12.413V7h2z" />
                    </svg>
                    <span className=" rtl:mr-1 font-display text-sm font-semibold group-hover:text-accent dark:text-jacarta-200">
                      View History
                    </span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
