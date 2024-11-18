import { MinaNetworkParams, Mainnet, Devnet, Zeko } from "./networks";

export function getChain(): "mainnet" | "devnet" | "zeko" {
  const chain = process.env.NEXT_PUBLIC_CHAIN;
  if (chain === undefined) throw new Error("NEXT_PUBLIC_CHAIN is undefined");
  if (chain !== "devnet" && chain !== "mainnet" && chain !== "zeko")
    throw new Error("NEXT_PUBLIC_CHAIN must be devnet or mainnet or zeko");
  return chain;
}

export function getChainId(): "mina:mainnet" | "mina:testnet" | "zeko:testnet" {
  const chain = getChain();
  const chainId = [Mainnet, Devnet, Zeko].find(
    (network) => network.chain === chain
  )?.chainId;
  if (
    chainId !== "mina:mainnet" &&
    chainId !== "mina:testnet" &&
    chainId !== "zeko:testnet"
  )
    throw new Error(
      "chainId must be mina:mainnet or mina:testnet or zeko:testnet"
    );
  return chainId;
}

export function getLaunchpadUrl(): string {
  const chain = getChain();
  const launchpadUrl = [Mainnet, Devnet, Zeko].find(
    (network) => network.chain === chain
  )?.launchpadUrl;
  if (launchpadUrl === undefined) throw new Error("launchpadUrl is undefined");
  return launchpadUrl;
}

export function getWallet(): string {
  const wallet = process.env.NEXT_PUBLIC_WALLET;
  if (wallet === undefined) throw new Error("NEXT_PUBLIC_WALLET is undefined");
  return wallet;
}

export function getNetwork(): MinaNetworkParams {
  const chain = getChain();
  switch (chain) {
    case "mainnet":
      return Mainnet;
    case "devnet":
      return Devnet;
    case "zeko":
      return Zeko;
    default:
      throw new Error("Chain not supported");
  }
}

export function explorerAccountUrl(): string {
  const network = getNetwork();
  return network.explorerAccountUrl;
}

export function explorerTransactionUrl(): string {
  const network = getNetwork();
  return network.explorerTransactionUrl;
}

export function explorerTokenUrl(): string {
  const network = getNetwork();
  return network.explorerTokenUrl;
}

export function getSiteName(): string {
  const chain = getChain();
  switch (chain) {
    case "mainnet":
      return "MinaTokens";
    case "devnet":
      return "MinaTokens";
    case "zeko":
      return "Zekotokens";
  }
}
