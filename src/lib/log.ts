"use client";
import { getWalletInfo } from "./wallet";
import { getSystemInfo } from "./system-info";
import { log as logtail } from "@logtail/next";
import { getChainId } from "./chain";
import { geo, unavailableCountry, isFetchedFailed } from "./availability";
import { nanoid } from "nanoid";

const id = nanoid();
const chainId = getChainId();
export const log = logtail.with({
  id,
  chainId,
  service: "web",
});

//TODO: remove wallet and system from the log when the version will be stable
async function logInfo() {
  const wallet = await getWalletInfo();
  const system = await getSystemInfo();
  const start = Date.now();
  while (!(geo || isFetchedFailed) && Date.now() - start < 10000) {
    await sleep(1000);
  }
  log.info("new browser session", {
    wallet,
    system,
    geo,
    unavailableCountry,
    isFetchedFailed,
    geoDelay: Date.now() - start,
  });
}
logInfo();

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
