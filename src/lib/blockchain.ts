"use server";
import { Mina, PublicKey, fetchAccount, Field, UInt64 } from "o1js";
import { getChain } from "./chain";

/**
 * blockchain is the type for the chain ID.
 */
export type blockchain = "local" | "devnet" | "lightnet" | "mainnet" | "zeko";

interface MinaNetwork {
  /** The Mina endpoints */
  mina: string[];

  /** The archive endpoints */
  archive: string[];

  /** The chain ID */
  chainId: blockchain;

  /** The name of the network (optional) */
  name?: string;

  /** The account manager for Lightnet (optional) */
  accountManager?: string;

  /** The explorer account URL (optional) */
  explorerAccountUrl?: string;

  /** The explorer transaction URL (optional) */
  explorerTransactionUrl?: string;

  /** The faucet URL (optional) */
  faucet?: string;
}

const Mainnet: MinaNetwork = {
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
  chainId: "mainnet",
  name: "Mainnet",
};

const Devnet: MinaNetwork = {
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
  chainId: "devnet",
  name: "Devnet",
  faucet: "https://faucet.minaprotocol.com",
};

const Zeko: MinaNetwork = {
  mina: ["https://devnet.zeko.io/graphql"],
  archive: [],
  explorerAccountUrl: "https://zekoscan.io/devnet/account/",
  explorerTransactionUrl: "https://zekoscan.io/devnet/tx/",
  chainId: "zeko",
  name: "Zeko",
  faucet: "https://zeko.io/faucet",
};

const Local: MinaNetwork = {
  mina: [],
  archive: [],
  chainId: "local",
};

const networks: MinaNetwork[] = [Mainnet, Local, Devnet, Zeko];

let currentNetwork: MinaNetwork | undefined = undefined;

export async function initBlockchain(): Promise<MinaNetwork> {
  const instance = getChain();
  if (currentNetwork !== undefined) {
    if (currentNetwork?.chainId === instance) {
      return currentNetwork;
    } else {
      throw new Error(
        `Network is already initialized to different chain ${currentNetwork.chainId}, cannot initialize to ${instance}`
      );
    }
  }

  // if (instance === "local") {
  //   const local = await Mina.LocalBlockchain({
  //     proofsEnabled: true,
  //   });
  //   Mina.setActiveInstance(local);

  //   currentNetwork = Local;
  //   return currentNetwork;
  // }

  const network = networks.find((n) => n.chainId === instance);
  if (network === undefined) {
    throw new Error("Unknown network");
  }

  const networkInstance = Mina.Network({
    mina: network.mina,
    archive: network.archive,
    lightnetAccountManager: network.accountManager,
    networkId: instance === "mainnet" ? "mainnet" : "testnet",
  });
  Mina.setActiveInstance(networkInstance);

  currentNetwork = network;
  return currentNetwork;
}

/**
 * Fetches the Mina account for a given public key with error handling
 * @param params the parameters for fetching the account
 * @param params.publicKey the public key of the account
 * @param params.tokenId the token id of the account
 * @param params.force whether to force the fetch - use it only if you are sure the account exists
 * @returns the account object
 */
export async function fetchMinaAccount(params: {
  publicKey: string | PublicKey;
  tokenId?: string | Field | undefined;
  force?: boolean;
}) {
  const { publicKey, tokenId, force } = params;
  const timeout = 1000 * 30; // 30 seconds
  const startTime = Date.now();
  let result = { account: undefined };
  while (Date.now() - startTime < timeout) {
    try {
      const result = await fetchAccount({
        publicKey,
        tokenId,
      });
      return result;
    } catch (error: any) {
      if (force === true)
        console.log("Error in fetchMinaAccount:", {
          error,
          publicKey:
            typeof publicKey === "string" ? publicKey : publicKey.toBase58(),
          tokenId: tokenId?.toString(),
          force,
        });
      else {
        console.log("fetchMinaAccount error", {
          error,
          publicKey:
            typeof publicKey === "string" ? publicKey : publicKey.toBase58(),
          tokenId: tokenId?.toString(),
          force,
        });
        return result;
      }
    }
    await sleep(1000 * 5);
  }
  if (force === true)
    throw new Error(
      `fetchMinaAccount timeout
      ${{
        publicKey:
          typeof publicKey === "string" ? publicKey : publicKey.toBase58(),
        tokenId: tokenId?.toString(),
        force,
      }}`
    );
  else
    console.log(
      "fetchMinaAccount timeout",
      typeof publicKey === "string" ? publicKey : publicKey.toBase58(),
      tokenId?.toString(),
      force
    );
  return result;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches the account balance for a given public key
 * @param address the public key
 * @returns the account balance
 */
export async function accountBalance(address: PublicKey): Promise<UInt64> {
  await fetchAccount({ publicKey: address });
  if (Mina.hasAccount(address)) return Mina.getBalance(address);
  else return UInt64.from(0);
}

/**
 * Fetches the account balance for a given public key and returns it in Mina
 * @param address the public key
 * @returns the account balance in MINA
 */
export async function accountBalanceMina(address: PublicKey): Promise<number> {
  return Number((await accountBalance(address)).toBigInt()) / 1e9;
}
