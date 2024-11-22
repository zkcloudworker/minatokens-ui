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
} from "o1js";
import { initBlockchain, fetchMinaAccount } from "@/lib/blockchain";
import { checkAddress } from "./address";
import { ApiResponse, NFTRequestAnswer, NFTRequestParams } from "./types";
import { algoliasearch } from "algoliasearch";
import { getChain } from "@/lib/chain";
const chain = getChain();

const IPFS_URL = process.env.IPFS_URL;
const IPFS_TOKEN = process.env.IPFS_TOKEN;
const NFT_ALGOLIA_PROJECT = process.env.NFT_ALGOLIA_PROJECT;
const NFT_ALGOLIA_KEY = process.env.NFT_ALGOLIA_KEY;

export async function getNFTState(
  params: NFTRequestParams,
  apiKeyAddress: string
): Promise<ApiResponse<NFTRequestAnswer>> {
  console.log("getNFTState", params);
  const { contractAddress, nftAddress } = params;
  if (chain === "zeko") {
    return { status: 400, json: { error: "Zeko is not supported" } };
  }
  if (
    contractAddress !==
    "B62qs2NthDuxAT94tTFg6MtuaP1gaBxTZyNv9D3uQiQciy1VsaimNFT"
  ) {
    return {
      status: 400,
      json: {
        error:
          "Invalid contract address, must be B62qs2NthDuxAT94tTFg6MtuaP1gaBxTZyNv9D3uQiQciy1VsaimNFT",
      },
    };
  }
  if (!checkAddress(nftAddress)) {
    return { status: 400, json: { error: "Invalid nftAddress" } };
  }

  if (IPFS_URL === undefined || IPFS_TOKEN === undefined) {
    return {
      status: 500,
      json: { error: "IPFS_URL or IPFS_TOKEN is not defined" },
    };
  }
  if (NFT_ALGOLIA_PROJECT === undefined || NFT_ALGOLIA_KEY === undefined) {
    return {
      status: 500,
      json: { error: "NFT_ALGOLIA_PROJECT or NFT_ALGOLIA_KEY is not defined" },
    };
  }
  try {
    await initBlockchain();
    const contractPublicKey = PublicKey.fromBase58(contractAddress);
    const nftPublicKey = PublicKey.fromBase58(nftAddress);
    const tokenId = TokenId.derive(contractPublicKey);

    await fetchMinaAccount({ publicKey: contractPublicKey, force: true });
    if (!Mina.hasAccount(contractPublicKey)) {
      return { status: 400, json: { error: "NFT contract account not found" } };
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
      return { status: 400, json: { error: "NFT account not found" } };
    }

    const account = Mina.getAccount(nftPublicKey, tokenId);
    const fields = account.zkapp?.appState;
    if (fields === undefined) {
      console.error("getNFTState: NFT app state not found", {
        nftAddress,
      });
      return { status: 400, json: { error: "NFT app state not found" } };
    }
    const NFTState_length = 8;
    if (fields.length !== NFTState_length) {
      console.error("getNFTState: NFT app state has invalid fields length", {
        nftAddress,
      });
      return {
        status: 400,
        json: { error: "NFT app state has invalid length" },
      };
    }
    if (NFTState.sizeInFields() !== NFTState_length) {
      console.error("getNFTState: NFTState has invalid length", {
        nftAddress,
      });
      return { status: 400, json: { error: "NFTState has invalid length" } };
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
        status: 500,
        json: {
          error:
            "failed to load metadata from IPFS: " +
            (metadata.error ?? "unknown error"),
        },
      };
    }
    const tokenState: NFTRequestAnswer = {
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
      status: 200,
      json: tokenState,
    };
  } catch (error: any) {
    console.error("getNFTState catch", error);
    return {
      status: 500,
      json: { error: "getNFTState catch:" + (error?.message ?? String(error)) },
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
