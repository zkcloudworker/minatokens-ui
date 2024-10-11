/* eslint-disable react/no-unescaped-entities */
"use client";
import FileUpload from "./FileUpload";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState, useContext } from "react";
import { AddressContext } from "@/context/address";
import { getWalletInfo, connectWallet } from "@/lib/wallet";
import { getTokenState } from "@/lib/state";

const DEBUG = process.env.NEXT_PUBLIC_DEBUG === "true";

const LaunchToken: React.FC = () => {
  const [image, setImage] = useState<File | undefined>(undefined);
  const [name, setName] = useState<string | undefined>(undefined);
  const [symbol, setSymbol] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState<string | undefined>(undefined);
  const { address, setAddress } = useContext(AddressContext);

  return (
    <section className="relative py-24">
      <picture className="pointer-events-none absolute inset-0 -z-10 dark:hidden">
        <Image
          width={1920}
          height={789}
          src="/img/gradient_light.jpg"
          priority
          alt="gradient"
          className="h-full w-full"
        />
      </picture>
      <div className="container">
        <h1 className="pt-16 text-center font-display text-4xl font-medium text-jacarta-700 dark:text-white">
          Launch your token
        </h1>

        <div className="flex justify-center space-x-8 mt-8 mb-8">
          <div className="flex flex-col items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-code h-12 w-12 text-[#9500fd] mb-2"
            >
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
            <span className="text-white">No Coding</span>
          </div>
          <div className="flex flex-col items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-zap h-12 w-12 text-[#9500fd] mb-2"
            >
              <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path>
            </svg>
            <span className="text-white">Mint Immediately</span>
          </div>
          <div className="flex flex-col items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-dollar-sign h-12 w-12 text-[#9500fd] mb-2"
            >
              <line x1="12" x2="12" y1="2" y2="22"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            <span className="text-white">Fixed Issue Fee</span>
          </div>
        </div>

        <div className="mx-auto max-w-[48.125rem]">
          {/* File Upload */}
          <FileUpload setImage={setImage} />

          {/* Name */}
          <div className="mb-6">
            <label
              htmlFor="item-name"
              className="mb-2 block font-display text-jacarta-700 dark:text-white"
            >
              Name <span className="text-red text-lg">*</span>
            </label>
            <p className="mb-3 text-sm dark:text-jacarta-300">
              The token name. Will be used in the token details and token lists.
            </p>
            <input
              type="text"
              id="item-name"
              className="w-full rounded-lg border-jacarta-100 py-3 hover:ring-2 hover:ring-accent/10 focus:ring-accent dark:border-jacarta-600 dark:bg-jacarta-700 dark:text-white dark:placeholder:text-jacarta-300"
              placeholder=""
              required
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Symbol */}
          <div className="mb-6">
            <label
              htmlFor="item-symbol"
              className="mb-2 block font-display text-jacarta-700 dark:text-white"
            >
              Symbol <span className="text-red text-lg">*</span>
            </label>
            <p className="mb-3 text-sm dark:text-jacarta-300">
              The token symbol. Max 6 chars.
            </p>
            <input
              type="text"
              id="item-symbol"
              className="w-full rounded-lg border-jacarta-100 py-3 hover:ring-2 hover:ring-accent/10 focus:ring-accent dark:border-jacarta-600 dark:bg-jacarta-700 dark:text-white dark:placeholder:text-jacarta-300"
              placeholder=""
              required
              maxLength={6}
              onInput={(e) => {
                const input = e.target as HTMLInputElement;
                setSymbol(input.value);
                if (input.value.length > 6) {
                  input.setCustomValidity(
                    "Symbol cannot be more than 6 characters"
                  );
                } else {
                  input.setCustomValidity("");
                }
              }}
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label
              htmlFor="item-description"
              className="mb-2 block font-display text-jacarta-700 dark:text-white"
            >
              Description
            </label>
            <p className="mb-3 text-sm dark:text-jacarta-300">
              The description will be included on the tokens's detail page.
              Markdown syntax is supported.
            </p>
            <textarea
              id="item-description"
              className="w-full rounded-lg border-jacarta-100 py-3 hover:ring-2 hover:ring-accent/10 focus:ring-accent dark:border-jacarta-600 dark:bg-jacarta-700 dark:text-white dark:placeholder:text-jacarta-300"
              rows={4}
              required
              placeholder=""
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>

          {/* External Link */}
          <div className="mb-6">
            <label
              htmlFor="item-external-link"
              className="mb-2 block font-display text-jacarta-700 dark:text-white"
            >
              Website
            </label>
            <p className="mb-3 text-sm dark:text-jacarta-300">
              We will include a link to this URL on this item's detail page, so
              that users can click to learn more about it. You are welcome to
              link to your own webpage with more details.
            </p>
            <input
              type="url"
              id="item-external-link"
              className="w-full rounded-lg border-jacarta-100 py-3 hover:ring-2 hover:ring-accent/10 focus:ring-accent dark:border-jacarta-600 dark:bg-jacarta-700 dark:text-white dark:placeholder:text-jacarta-300"
              placeholder="https://yoursite.io/item/123"
            />
          </div>

          {/* Mint addresses */}
          <div className="relative border-b border-jacarta-100 py-6 dark:border-jacarta-600">
            <div className="flex items-center justify-between">
              <div className="flex">
                <div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    className="inline-block mr-2 -mt-1 h-4 w-4 shrink-0 fill-jacarta-700 dark:fill-white"
                  >
                    <path fill="none" d="M0 0h24v24H0z" />
                    <path d="M8 4h13v2H8V4zM5 3v3h1v1H3V6h1V4H3V3h2zM3 14v-2.5h2V11H3v-1h3v2.5H4v.5h2v1H3zm2 5.5H3v-1h2V18H3v-1h3v4H3v-1h2v-.5zM8 11h13v2H8v-2zm0 7h13v2H8v-2z" />
                  </svg>
                  <label className="font-display text-jacarta-700 dark:text-white">
                    Mint addresses
                  </label>
                  <p className="dark:text-jacarta-300">
                    Input here the list of addresses and amounts that will be
                    minted.
                  </p>
                </div>
              </div>
              <button
                className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-accent bg-white hover:border-transparent hover:bg-accent dark:bg-jacarta-700"
                type="button"
                id="item-properties"
                data-bs-toggle="modal"
                data-bs-target="#MintAddressesModal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  className="fill-accent group-hover:fill-white"
                >
                  <path fill="none" d="M0 0h24v24H0z" />
                  <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="mt-6">
            <button
              disabled
              className="cursor-default rounded-full bg-accent-dark py-3 px-8 text-center font-semibold text-white transition-all"
            >
              Launch it!
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LaunchToken;
