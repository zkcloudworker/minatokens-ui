import { Mainnet, Devnet, Zeko, MinaNetwork } from "@silvana-one/api";

export function getSiteType(): "nft" | "token" {
  const type = process.env.NEXT_PUBLIC_SITE_TYPE;
  if (type === undefined) throw new Error("NEXT_PUBLIC_SITE_TYPE is undefined");
  if (type !== "nft" && type !== "token")
    throw new Error("NEXT_PUBLIC_SITE_TYPE must be nft or token");
  return type;
}

export function getChain():
  | "mina:mainnet"
  | "mina:devnet"
  | "mina:testnet"
  | "zeko:testnet" {
  const chain = process.env.NEXT_PUBLIC_CHAIN;
  if (chain === undefined) throw new Error("NEXT_PUBLIC_CHAIN is undefined");
  if (
    chain !== "mina:devnet" &&
    chain !== "mina:mainnet" &&
    chain !== "mina:testnet" &&
    chain !== "zeko:testnet"
  )
    throw new Error(
      "NEXT_PUBLIC_CHAIN must be mina:devnet, mina:testnet, mina:mainnet or zeko:testnet"
    );
  return chain;
}

export function getPrismaChainName():
  | "mina_mainnet"
  | "mina_devnet"
  | "zeko_devnet" {
  const chain = getChain();
  switch (chain) {
    case "mina:mainnet":
      return "mina_mainnet";
    case "mina:devnet":
    case "mina:testnet":
      return "mina_devnet";
    case "zeko:testnet":
      return "zeko_devnet";
    default:
      throw new Error("Chain not supported");
  }
}

export function convertToPrismaChain(
  chain: string | undefined
): "mina_mainnet" | "mina_devnet" | "zeko_devnet" | "zeko_mainnet" | undefined {
  if (!chain) return undefined;

  switch (chain) {
    case "mina:mainnet":
    case "mina_mainnet":
      return "mina_mainnet";
    case "mina:devnet":
    case "mina:testnet":
    case "mina_devnet":
      return "mina_devnet";
    case "zeko:testnet":
    case "zeko_devnet":
      return "zeko_devnet";
    case "zeko:mainnet":
    case "zeko_mainnet":
      return "zeko_mainnet";
    default:
      return undefined;
  }
}

export function getAlgoliaChain(): string {
  const chain = getChain();
  return chain === "mina:mainnet"
    ? "mainnet"
    : chain === "mina:devnet"
    ? "devnet"
    : chain === "mina:testnet"
    ? "testnet"
    : "zeko";
}

export function getLaunchpadUrl(): string {
  const chain = getChain();
  switch (chain) {
    case "mina:mainnet":
      return "https://minatokens.com";
    case "mina:devnet":
    case "mina:testnet":
      return "https://minatokens.com";
    case "zeko:testnet":
      return "https://zekotokens.com";
    default:
      throw new Error("Chain not supported");
  }
}

export function getWallet(): string {
  const wallet = process.env.NEXT_PUBLIC_WALLET;
  if (wallet === undefined) throw new Error("NEXT_PUBLIC_WALLET is undefined");
  return wallet;
}

export function getNetwork(): MinaNetwork {
  const chain = getChain();
  switch (chain) {
    case "mina:mainnet":
      return Mainnet;
    case "mina:devnet":
    case "mina:testnet":
      return Devnet;
    case "zeko:testnet":
      return Zeko;
    default:
      throw new Error("Chain not supported");
  }
}

export function explorerAccountUrl(): string {
  const network = getNetwork();
  const explorerAccountUrl = network.explorerAccountUrl;
  if (explorerAccountUrl === undefined)
    throw new Error("explorerAccountUrl is undefined");
  return explorerAccountUrl;
}

export function explorerTransactionUrl(): string {
  const network = getNetwork();
  const explorerTransactionUrl = network.explorerTransactionUrl;
  if (explorerTransactionUrl === undefined)
    throw new Error("explorerTransactionUrl is undefined");
  return explorerTransactionUrl;
}

export function explorerTokenUrl(): string {
  const network = getNetwork();
  const explorerTokenUrl = network.explorerTokenUrl;
  if (explorerTokenUrl === undefined)
    throw new Error("explorerTokenUrl is undefined");
  return explorerTokenUrl;
}

export function getSiteName(): string {
  const type = getSiteType();
  if (type === "nft") {
    return "NFT Standard";
  } else {
    const chain = getChain();
    switch (chain) {
      case "mina:mainnet":
        return "MinaTokens";
      case "mina:devnet":
      case "mina:testnet":
        return "MinaTokens";
      case "zeko:testnet":
        return "ZekoTokens";
    }
  }
}
