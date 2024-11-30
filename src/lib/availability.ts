"use client";
import { log } from "./log";

export let geo: object | null = null;
export let isAvailable: boolean = true;

export async function checkAvailability() {
  try {
    const token = process.env.NEXT_PUBLIC_IPINFO_TOKEN;
    if (token === undefined)
      log.error("NEXT_PUBLIC_IPINFO_TOKEN is not defined");
    const response = await fetch(`https://ipinfo.io?token=${token}`);
    if (!response.ok) return undefined;
    const result = await response.json();
    geo = result;
    isAvailable = isAvailable && result?.country !== "US";
    if (!isAvailable) {
      log.error("MinaTokens.com is not available", {
        country: result?.country,
        geo: result,
        isAvailable,
      });
    }
    return isAvailable;
  } catch (error) {
    log.error("checkGeo error", { error });
    return undefined;
  }
}
checkAvailability();
