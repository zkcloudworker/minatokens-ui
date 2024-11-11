"use server";
import {
  Mina,
  PublicKey,
  Bool,
  TokenId,
  fetchAccount,
  Struct,
  UInt8,
  Field,
} from "o1js";
import { getChain } from "@/lib/chain";
const chain = getChain();

interface TokenState {
  tokenAddress: string;
  tokenId: string;
  adminContractAddress: string;
  adminAddress: string;
  adminTokenBalance: number;
  totalSupply: number;
  isPaused: boolean;
  decimals: number;
  tokenSymbol: string;
  verificationKeyHash: string;
  uri: string;
  version: number;
  adminTokenSymbol: string;
  adminUri: string;
  adminVerificationKeyHash: string;
  adminVersion: number;
}

class FungibleTokenState extends Struct({
  decimals: UInt8,
  admin: PublicKey,
  paused: Bool,
}) {}

const FungibleTokenStateSize = FungibleTokenState.sizeInFields();

class FungibleTokenAdminState extends Struct({
  adminPublicKey: PublicKey,
}) {}

const FungibleTokenAdminStateSize = FungibleTokenAdminState.sizeInFields();
export async function getTokenStateForApi(params: {
  tokenAddress: string;
}): Promise<
  | {
      success: true;
      tokenState: TokenState;
    }
  | {
      success: false;
      error: string;
    }
> {
  const { tokenAddress } = params;
  try {
    console.log("getTokenStateForApi", { tokenAddress, chain });
    await initBlockchain(chain);
    console.log("initBlockchain done");
    const tokenContractPublicKey = PublicKey.fromBase58(tokenAddress);

    await fetchMinaAccount({ publicKey: tokenContractPublicKey, force: false });
    if (!Mina.hasAccount(tokenContractPublicKey)) {
      return { success: false, error: "Token contract account not found" };
    }
    const tokenId = TokenId.derive(tokenContractPublicKey);
    await fetchMinaAccount({
      publicKey: tokenContractPublicKey,
      tokenId,
      force: false,
    });
    if (!Mina.hasAccount(tokenContractPublicKey, tokenId)) {
      console.error(
        "getTokenState: Token contract totalSupply account not found",
        {
          tokenAddress,
        }
      );
      return {
        success: false,
        error: "Token contract totalSupply account not found",
      };
    }
    const account = Mina.getAccount(tokenContractPublicKey);
    if (account.zkapp?.appState === undefined) {
      console.error("getTokenState: Token contract state not found", {
        tokenAddress,
      });
      return {
        success: false,
        error: "Token contract state not found",
      };
    }
    const state = FungibleTokenState.fromFields(
      account.zkapp?.appState.slice(0, FungibleTokenStateSize)
    );
    const adminContractPublicKey = state.admin;
    const decimals = state.decimals.toNumber();
    const isPaused = state.paused.toBoolean();
    const totalSupply =
      Number(Mina.getBalance(tokenContractPublicKey, tokenId).toBigInt()) /
      1_000_000_000;
    const tokenSymbol = account.tokenSymbol;
    const uri = account.zkapp?.zkappUri;

    if (uri === undefined) {
      console.error("getTokenState: Token uri not found", {
        tokenAddress,
      });
      return {
        success: false,
        error: "Token uri not found",
      };
    }
    const verificationKeyHash = account.zkapp?.verificationKey?.hash.toJSON();
    if (verificationKeyHash === undefined) {
      console.error("getTokenState: Token verification key hash not found", {
        tokenAddress,
      });
      return {
        success: false,
        error: "Token verification key hash not found",
      };
    }
    const versionData = account.zkapp?.zkappVersion;
    if (versionData === undefined) {
      console.error("getTokenState: Token contract version not found", {
        tokenAddress,
      });
      return {
        success: false,
        error: "Token contract version not found",
      };
    }
    const version = Number(versionData.toBigint());

    await fetchMinaAccount({ publicKey: adminContractPublicKey, force: false });
    if (!Mina.hasAccount(adminContractPublicKey)) {
      console.error("getTokenState: Admin contract account not found", {
        tokenAddress,
      });
      return {
        success: false,
        error: "Admin contract account not found",
      };
    }

    const adminContract = Mina.getAccount(adminContractPublicKey);
    const adminTokenSymbol = adminContract.tokenSymbol;
    const adminUri = adminContract.zkapp?.zkappUri;

    const adminVerificationKeyHash =
      adminContract.zkapp?.verificationKey?.hash.toJSON();
    if (adminVerificationKeyHash === undefined) {
      console.error(
        "getTokenState: Admin contract verification key hash not found",
        {
          adminContractPublicKey: adminContractPublicKey.toBase58(),
        }
      );
      return {
        success: false,
        error: "Admin contract verification key hash not found",
      };
    }
    const adminVersionData = adminContract.zkapp?.zkappVersion;
    if (adminVersionData === undefined) {
      console.error("getTokenState: Admin contract version not found", {
        adminContractPublicKey: adminContractPublicKey.toBase58(),
      });
      return {
        success: false,
        error: "Admin contract version not found",
      };
    }
    const adminVersion = Number(adminVersionData.toBigint());
    const adminAddress0 = adminContract.zkapp?.appState[0];
    const adminAddress1 = adminContract.zkapp?.appState[1];
    if (adminAddress0 === undefined || adminAddress1 === undefined) {
      console.error("Cannot fetch admin address from admin contract");
      return {
        success: false,
        error: "Cannot fetch admin address from admin contract",
      };
    }
    const adminAddress = PublicKey.fromFields([adminAddress0, adminAddress1]);
    let adminTokenBalance = 0;
    try {
      await fetchMinaAccount({
        publicKey: adminAddress,
        tokenId,
        force: false,
      });
      adminTokenBalance = Number(
        Mina.getBalance(adminAddress, tokenId).toBigInt()
      );
    } catch (error) {}

    const tokenState: TokenState = {
      tokenAddress: tokenContractPublicKey.toBase58(),
      tokenId: TokenId.toBase58(tokenId),
      adminContractAddress: adminContractPublicKey.toBase58(),
      adminAddress: adminAddress.toBase58(),
      adminTokenBalance,
      totalSupply,
      isPaused,
      decimals,
      tokenSymbol,
      verificationKeyHash,
      uri,
      version,
      adminTokenSymbol,
      adminUri: adminUri ?? "",
      adminVerificationKeyHash,
      adminVersion,
    };

    return {
      success: true,
      tokenState,
    };
  } catch (error: any) {
    console.error("getTokenState catch", error);
    return {
      success: false,
      error: "getTokenState catch:" + (error?.message ?? String(error)),
    };
  }
}

/**
 * blockchain is the type for the chain ID.
 */
type blockchain = "local" | "devnet" | "lightnet" | "mainnet" | "zeko";

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

async function initBlockchain(instance: blockchain): Promise<MinaNetwork> {
  if (currentNetwork !== undefined) {
    if (currentNetwork?.chainId === instance) {
      return currentNetwork;
    } else {
      throw new Error(
        `Network is already initialized to different chain ${currentNetwork.chainId}, cannot initialize to ${instance}`
      );
    }
  }

  if (instance === "local") {
    const local = await Mina.LocalBlockchain({
      proofsEnabled: true,
    });
    Mina.setActiveInstance(local);

    currentNetwork = Local;
    return currentNetwork;
  }

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
  const timeout = 1000 * 10; // 10 seconds
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
