"use client";
import { log } from "./log";
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
  { code: "IN", name: "India" },
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

export async function checkAvailability(): Promise<Country | null> {
  if (unavailableCountry || isChecked) return unavailableCountry;
  try {
    const token = process.env.NEXT_PUBLIC_IPINFO_TOKEN;
    if (token === undefined) {
      log.error("NEXT_PUBLIC_IPINFO_TOKEN is not defined");
      isFetchedFailed = true;
      return null;
    }
    const response = await fetch(`https://ipinfo.io?token=${token}`);
    if (!response.ok) {
      log.error(
        `checkAvailability error: not ok : ${response.status} ${response.statusText}`
      );
      isFetchedFailed = true;
      return null;
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
    return unavailableCountry;
  } catch (error: any) {
    log.error(
      `checkAvailability error : ${
        typeof error?.message === "string" ? error?.message : "unknown"
      }`,
      { error }
    );
    isFetchedFailed = true;
    return unavailableCountry;
  }
}
checkAvailability();
