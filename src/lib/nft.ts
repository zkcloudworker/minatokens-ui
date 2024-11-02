"use server";
import {
  Mina,
  PublicKey,
  Bool,
  TokenId,
  Struct,
  Field,
  Provable,
  Encoding,
  UInt64,
  UInt32,
  fetchAccount,
  UInt8,
} from "o1js";
import { algoliasearch } from "algoliasearch";

const IPFS_URL = process.env.IPFS_URL;
const IPFS_TOKEN = process.env.IPFS_TOKEN;
const NFT_ALGOLIA_PROJECT = process.env.NFT_ALGOLIA_PROJECT;
const NFT_ALGOLIA_KEY = process.env.NFT_ALGOLIA_KEY;

interface NFTStateJson {
  contractAddress: string;
  nftAddress: string;
  tokenId: string;
  tokenSymbol: string;
  contractUri: string | null;
  name: string;
  metadataRoot: {
    data: string;
    kind: string;
  };
  storage: string;
  owner: string;
  price: number;
  version: number;
  metadata: object | null;
  algolia: object | null;
}

export async function getNFTState(params: {
  contractAddress: string; // always B62qs2NthDuxAT94tTFg6MtuaP1gaBxTZyNv9D3uQiQciy1VsaimNFT
  nftAddress: string; // example: B62qnkz5juL135pJAw7XjLXwvrKAdgbau1V9kEpC1S1x8PfUxcu8KMP on mainnet
  // B62qoT6jXebkJVmsUmxCxGJmvHJUXPNF417rms4PATi5R6Hw7e56CRt on devnet with markdown
  chain: "devnet" | "mainnet";
}): Promise<
  | {
      success: true;
      tokenState: NFTStateJson;
    }
  | {
      success: false;
      error: string;
    }
> {
  const { contractAddress, nftAddress, chain } = params;
  if (
    contractAddress !==
    "B62qs2NthDuxAT94tTFg6MtuaP1gaBxTZyNv9D3uQiQciy1VsaimNFT"
  ) {
    return {
      success: false,
      error:
        "Invalid contract address, must be B62qs2NthDuxAT94tTFg6MtuaP1gaBxTZyNv9D3uQiQciy1VsaimNFT",
    };
  }
  if (IPFS_URL === undefined || IPFS_TOKEN === undefined) {
    return {
      success: false,
      error: "IPFS_URL or IPFS_TOKEN is not defined",
    };
  }
  if (NFT_ALGOLIA_PROJECT === undefined || NFT_ALGOLIA_KEY === undefined) {
    return {
      success: false,
      error: "NFT_ALGOLIA_PROJECT or NFT_ALGOLIA_KEY is not defined",
    };
  }
  try {
    await initBlockchain(chain);
    const contractPublicKey = PublicKey.fromBase58(contractAddress);
    const nftPublicKey = PublicKey.fromBase58(nftAddress);
    const tokenId = TokenId.derive(contractPublicKey);

    await fetchMinaAccount({ publicKey: contractPublicKey, force: true });
    if (!Mina.hasAccount(contractPublicKey)) {
      console.error("getNFTState: NFT contract account not found", {
        contractAddress,
      });
      return { success: false, error: "NFT contract account not found" };
    }
    const contractAccount = Mina.getAccount(contractPublicKey);
    const tokenSymbol = contractAccount.tokenSymbol;
    const uri = contractAccount.zkapp?.zkappUri;

    await fetchMinaAccount({ publicKey: nftPublicKey, tokenId, force: false });
    if (!Mina.hasAccount(nftPublicKey, tokenId)) {
      console.error("getNFTState: NFT account not found", {
        nftAddress,
        tokenId: TokenId.toBase58(tokenId),
      });
      return { success: false, error: "NFT account not found" };
    }

    const account = Mina.getAccount(nftPublicKey, tokenId);
    const fields = account.zkapp?.appState;
    if (fields === undefined) {
      console.error("getNFTState: NFT app state not found", {
        nftAddress,
      });
      return { success: false, error: "NFT app state not found" };
    }
    const NFTState_length = 8;
    if (fields.length !== NFTState_length) {
      console.error("getNFTState: NFT app state has invalid fields length", {
        nftAddress,
      });
      return { success: false, error: "NFT app state has invalid length" };
    }
    if (NFTState.sizeInFields() !== NFTState_length) {
      console.error("getNFTState: NFTState has invalid length", {
        nftAddress,
      });
      return { success: false, error: "NFTState has invalid length" };
    }

    const state: NFTState = NFTState.fromFields(fields);
    const name = Encoding.stringFromFields([state.name]);
    const data = NFTparams.unpack(state.data);
    const ipfs = state.storage.toIpfsHash();
    const algolia = await algoliaGetNFT({ contractAddress, name, chain });
    const metadata = await loadFromIPFS(ipfs);
    if (!metadata.success) {
      console.error("getNFTState: failed to load metadata from IPFS", {
        nftAddress,
        error: metadata.error,
      });
      return {
        success: false,
        error:
          "failed to load metadata from IPFS: " +
          (metadata.error ?? "unknown error"),
      };
    }
    const tokenState: NFTStateJson = {
      contractAddress,
      nftAddress,
      tokenId: TokenId.toBase58(tokenId),
      tokenSymbol,
      contractUri: uri ?? null,
      name,
      metadataRoot: {
        data: state.metadata.data.toJSON(),
        kind: state.metadata.kind.toJSON(),
      },
      storage: ipfs,
      owner: state.owner.toBase58(),
      price: Number(data.price.value.toBigInt()),
      version: Number(data.version.value.toBigInt()),
      algolia: algolia ?? null,
      metadata: metadata.success ? metadata.data : null,
    };

    return {
      success: true,
      tokenState,
    };
  } catch (error: any) {
    console.error("getNFTState catch", error);
    return {
      success: false,
      error: "getNFTState catch:" + (error?.message ?? String(error)),
    };
  }
}

class Metadata extends Struct({
  data: Field,
  kind: Field,
}) {
  /**
   * Asserts that two Metadata objects are equal
   * @param state1 first Metadata object
   * @param state2 second Metadata object
   */
  static assertEquals(state1: Metadata, state2: Metadata) {
    state1.data.assertEquals(state2.data);
    state1.kind.assertEquals(state2.kind);
  }
}

class Storage extends Struct({
  hashString: Provable.Array(Field, 2),
}) {
  constructor(value: { hashString: [Field, Field] }) {
    super(value);
  }

  static empty(): Storage {
    return new Storage({ hashString: [Field(0), Field(0)] });
  }

  isEmpty(): Bool {
    return this.hashString[0]
      .equals(Field(0))
      .and(this.hashString[1].equals(Field(0)));
  }

  static assertEquals(a: Storage, b: Storage) {
    a.hashString[0].assertEquals(b.hashString[0]);
    a.hashString[1].assertEquals(b.hashString[1]);
  }

  static fromIpfsHash(hash: string): Storage {
    const fields = Encoding.stringToFields("i:" + hash);
    if (fields.length !== 2) throw new Error("Invalid IPFS hash");
    return new Storage({ hashString: [fields[0], fields[1]] });
  }

  toIpfsHash(): string {
    const hash = Encoding.stringFromFields(this.hashString);
    if (hash.startsWith("i:")) {
      return hash.substring(2);
    } else throw new Error("Invalid IPFS hash");
  }

  toString(): string {
    if (this.isEmpty().toBoolean()) return "";
    else return Encoding.stringFromFields(this.hashString);
  }

  static fromString(storage: string) {
    if (
      storage.startsWith("i:") === false &&
      storage.startsWith("a:") === false
    )
      throw new Error("Invalid storage string");
    const fields = Encoding.stringToFields(storage);
    if (fields.length !== 2) throw new Error("Invalid storage string");
    return new Storage({ hashString: [fields[0], fields[1]] });
  }
}

class NFTparams extends Struct({
  price: UInt64,
  version: UInt32,
}) {
  pack(): Field {
    const price = this.price.value.toBits(64);
    const version = this.version.value.toBits(32);
    return Field.fromBits([...price, ...version]);
  }
  static unpack(packed: Field) {
    const bits = packed.toBits(64 + 32);
    const price = UInt64.from(0);
    price.value = Field.fromBits(bits.slice(0, 64));
    const version = UInt32.from(0);
    version.value = Field.fromBits(bits.slice(64, 64 + 32));
    return new NFTparams({ price, version });
  }
}

class NFTState extends Struct({
  name: Field,
  metadata: Metadata,
  storage: Storage,
  owner: PublicKey,
  data: Field,
}) {}

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

export async function loadFromIPFS(
  hash: string
): Promise<
  { success: true; data: object } | { success: false; error: string }
> {
  if (IPFS_URL === undefined || IPFS_TOKEN === undefined) {
    throw new Error("IPFS_URL or IPFS_TOKEN is not defined");
  }
  try {
    const url = IPFS_URL + hash + "?pinataGatewayToken=" + IPFS_TOKEN;
    const response = await fetch(url);
    if (!response.ok) {
      console.error("loadFromIPFS error:", response.statusText);
      return { success: false, error: response.statusText };
    }
    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    console.error("loadFromIPFS error:", error?.message ?? error);
    return { success: false, error: error?.message ?? String(error) };
  }
}

export async function algoliaGetNFT(params: {
  contractAddress: string;
  name: string;
  chain: "devnet" | "mainnet";
}): Promise<object | undefined> {
  const { contractAddress, name, chain } = params;
  if (NFT_ALGOLIA_KEY === undefined)
    throw new Error("NFT_ALGOLIA_KEY is undefined");
  if (NFT_ALGOLIA_PROJECT === undefined)
    throw new Error("NFT_ALGOLIA_PROJECT is undefined");
  try {
    const client = algoliasearch(NFT_ALGOLIA_PROJECT, NFT_ALGOLIA_KEY);
    const result = await client.getObject({
      indexName: chain,
      objectID: chain + "." + contractAddress + "." + name,
    });
    return result;
  } catch (error: any) {
    console.error("algoliaGetNFT:", {
      error: error?.message ?? String(error),
      params,
    });
    return undefined;
  }
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
