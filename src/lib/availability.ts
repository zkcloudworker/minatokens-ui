"use client";
import { log } from "./log";
import { getChain } from "@/lib/chain";
import { isWhitelisted } from "@/lib/list";
const chain = getChain();
interface Country {
  code: string;
  name: string;
}
export let geo: object | null = null;
export let unavailableCountry: Country | null = null;
let isChecked = false;
export let isFetchedFailed = false;
// ISO 3166 country codes are used
export const countriesNotAvailable: Country[] = [
  { code: "US", name: "United States" },
  { code: "CN", name: "China" },
  // { code: "IN", name: "India" }, TODO: check regulation
  { code: "IR", name: "Iran" },
  { code: "KP", name: "North Korea" },
  { code: "CU", name: "Cuba" },
  { code: "SY", name: "Syria" },
  { code: "SD", name: "Sudan" },
  { code: "BY", name: "Belarus" },
  { code: "IQ", name: "Iraq" },
  { code: "RU", name: "Russia" },
  { code: "VE", name: "Venezuela" },
  { code: "MM", name: "Myanmar" },
  { code: "DZ", name: "Algeria" },
  { code: "BO", name: "Bolivia" },
  { code: "EC", name: "Ecuador" },
  { code: "NP", name: "Nepal" },
  { code: "BD", name: "Bangladesh" },
  { code: "MA", name: "Morocco" },
];
let savedAddress: string | undefined = undefined;
let isWhitelistedAddress: boolean = false as boolean;

export async function checkAvailability(params: {
  address?: string;
  retry?: boolean;
}): Promise<Country | null> {
  const { address, retry = false } = params;
  if (chain !== "mina:mainnet") {
    isChecked = true;
    return null;
  }
  if ((unavailableCountry || isChecked) && address === savedAddress)
    return isWhitelistedAddress ? null : unavailableCountry;
  try {
    const whitelistPromise = address ? isWhitelisted({ address }) : undefined;
    if (!isChecked) {
      const token = process.env.NEXT_PUBLIC_IPINFO_TOKEN;
      if (token === undefined) {
        log.error("NEXT_PUBLIC_IPINFO_TOKEN is not defined");
        isFetchedFailed = true;
        return null;
      }

      let response = await fetch(`https://ipinfo.io?token=${token}`);
      if (!response.ok) {
        await sleep(5000);
        response = await fetch(`https://ipinfo.io?token=${token}`);
        if (!response.ok) {
          log.error(
            `checkAvailability error: not ok : ${response.status} ${response.statusText}`,
            { retry }
          );
          isFetchedFailed = true;
          return null;
        }
      }
      const result = await response.json();
      const country = countriesNotAvailable.find(
        (country) => country.code === result?.country
      );
      if (country) {
        log.info(`checkAvailability: not available in ${country.name}`, {
          code: country.code,
          name: country.name,
          geo: result,
          unavailableCountry,
        });
        unavailableCountry = country;
      }

      isChecked = result?.country !== undefined;
      if (!isChecked)
        log.error("checkAvailability: country is undefined", {
          geo: result,
        });
      geo = isChecked ? result : geo;
    }
    const whitelisted = whitelistPromise ? await whitelistPromise : false;
    if (whitelisted) {
      isWhitelistedAddress = true;
      savedAddress = address;
      return null;
    }
    return unavailableCountry;
  } catch (error: any) {
    if (retry) {
      log.info(
        `checkAvailability error : ${
          typeof error?.message === "string" ? error?.message : "unknown"
        }`,
        { error, retry }
      );
      isFetchedFailed = true;
      return unavailableCountry;
    }
    await sleep(5000);
    return await checkAvailability({ retry: true });
  }
}
checkAvailability({});

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
