export interface MinaNetworkParams {
  /** The Mina endpoints */
  mina: string[];

  /** The archive endpoints */
  archive: string[];

  /** The chain name */
  chain: "mainnet" | "devnet" | "zeko";

  chainId: "mina:mainnet" | "mina:testnet" | "zeko:testnet";

  /** The explorer account URL  */
  explorerAccountUrl: string;

  /** The explorer token URL  */
  explorerTokenUrl: string;

  /** The explorer transaction URL  */
  explorerTransactionUrl: string;

  /** The launchpad URL */
  launchpadUrl: string;
}

export const Mainnet: MinaNetworkParams = {
  mina: [
    //"https://proxy.devnet.minaexplorer.com/graphql",
    "https://api.minascan.io/node/mainnet/v1/graphql",
  ],
  archive: [
    "https://api.minascan.io/archive/mainnet/v1/graphql",
    //"https://archive.devnet.minaexplorer.com",
  ],
  explorerAccountUrl: "https://minascan.io/mainnet/account/",
  explorerTransactionUrl: "https://minascan.io/mainnet/tx/",
  explorerTokenUrl: "https://minascan.io/mainnet/token/",
  chain: "mainnet",
  chainId: "mina:mainnet",
  launchpadUrl: "https://minatokens.com",
};

export const Devnet: MinaNetworkParams = {
  mina: [
    "https://api.minascan.io/node/devnet/v1/graphql",
    //"https://proxy.devnet.minaexplorer.com/graphql",
  ],
  archive: [
    "https://api.minascan.io/archive/devnet/v1/graphql",
    //"https://archive.devnet.minaexplorer.com",
  ],
  explorerAccountUrl: "https://minascan.io/devnet/account/",
  explorerTransactionUrl: "https://minascan.io/devnet/tx/",
  chain: "devnet",
  chainId: "mina:testnet",
  explorerTokenUrl: "https://minascan.io/devnet/token/",
  launchpadUrl: "https://minatokens.com",
};

export const Zeko: MinaNetworkParams = {
  mina: ["https://devnet.zeko.io/graphql"],
  archive: [],
  explorerAccountUrl: "https://zekoscan.io/devnet/account/",
  explorerTransactionUrl: "https://zekoscan.io/devnet/tx/",
  chain: "zeko",
  chainId: "zeko:testnet",
  explorerTokenUrl: "https://zekoscan.io/devnet/token/",
  launchpadUrl: "https://zekotokens.com",
};
