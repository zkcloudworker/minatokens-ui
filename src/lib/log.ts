"use client";
import { getWalletInfo } from "./wallet";
import { getSystemInfo } from "./system-info";
import { log as logtail } from "@logtail/next";
import { getChainId } from "./chain";
import { geo, unavailableCountry } from "./availability";
const chainId = getChainId();

export let wallet: {
  address: string | undefined;
  network: string | undefined;
  isAuro: boolean | undefined;
} = {
  address: undefined,
  network: undefined,
  isAuro: undefined,
};
let system: object | null = null;
let ip: string | null = null;

async function getInfo() {
  if (!wallet) wallet = await getWalletInfo();
  if (!system) system = await getSystemInfo();
}
getInfo();

export const log = logtail.with({
  wallet,
  system,
  chainId,
  geo,
  unavailableCountry,
  service: "web",
});
