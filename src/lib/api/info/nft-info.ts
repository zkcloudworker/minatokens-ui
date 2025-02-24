"use server";
import { Mina, PublicKey, TokenId, Field } from "o1js";
import { initBlockchain, fetchMinaAccount } from "@/lib/blockchain";
import {
  Collection,
  NFT,
  MintEvent,
  NFTData,
  fieldToString,
  CollectionData,
} from "@silvana-one/nft";
import { createIpfsURL } from "@silvana-one/storage";
import {
  CollectionInfo,
  NftInfo,
  NftRequestParams,
  NftRequestAnswer,
} from "@silvana-one/api";
import { ApiName, ApiResponse } from "../api-types";
import { checkAddress } from "../utils/address";
import { debug } from "@/lib/debug";
import { log as logtail } from "@logtail/next";
import { getChain } from "@/lib/chain";
import { algoliasearch } from "algoliasearch";
const { NFT_ALGOLIA_KEY, NFT_ALGOLIA_PROJECT } = process.env;
const chain = getChain();
const log = logtail.with({
  service: "nft-info",
  chain,
});
const DEBUG = debug();
const indexName = `standard-${chain}`;
if (NFT_ALGOLIA_KEY === undefined) {
  log.error("NFT_ALGOLIA_KEY is undefined");
  throw new Error("NFT_ALGOLIA_KEY is undefined");
}
if (NFT_ALGOLIA_PROJECT === undefined) {
  log.error("NFT_ALGOLIA_PROJECT is undefined");
  throw new Error("NFT_ALGOLIA_PROJECT is undefined");
}

const client = algoliasearch(NFT_ALGOLIA_PROJECT, NFT_ALGOLIA_KEY);

export async function getNFTState(props: {
  params: NftRequestParams;
  name: ApiName;
  apiKeyAddress: string;
}): Promise<ApiResponse<NftRequestAnswer>> {
  const { params, name, apiKeyAddress } = props;
  const { nftAddress, collectionAddress } = params;
  try {
    await initBlockchain();
    if (!checkAddress(collectionAddress)) {
      return {
        status: 400,
        json: { error: "Invalid collection address" },
      };
    }

    if (nftAddress && !checkAddress(nftAddress)) {
      return {
        status: 400,
        json: { error: "Invalid NFT address" },
      };
    }

    const info = await getNftInfo({
      nftAddress,
      collectionAddress,
    });
    if (!info) {
      return { status: 400, json: { error: "NFT not found" } };
    }

    const { nft, collection } = info;
    if (collectionAddress !== collection.collectionAddress) {
      return {
        status: 500,
        json: { error: "Internal error: Collection address mismatch" },
      };
    }
    const nftInfo = (await algoliaGetNFT({
      collectionAddress,
      nftAddress: nft.tokenAddress,
    })) as NftInfo | undefined;
    if (nftInfo) {
      // Update nftInfo with any changed values from nft
      let isUpdated = false;
      const updatedKeys: string[] = [];
      for (const key in nftInfo) {
        if (
          key in nft &&
          nft[key as keyof typeof nft] !== undefined &&
          nft[key as keyof typeof nft] !== (nftInfo as any)[key]
        ) {
          (nftInfo as any)[key] = nft[key as keyof typeof nft];
          isUpdated = true;
          updatedKeys.push(key);
        }
      }
      if (isUpdated) {
        log.info("algoliaWriteNFT: Updating NFT", {
          nftInfo,
          updatedKeys,
        });
        await algoliaWriteNFT(nftInfo);
      }
    } else {
      await algoliaWriteNFT(nft);
    }

    const collectionInfo = (await algoliaGetNFT({
      collectionAddress,
    })) as CollectionInfo | undefined;
    if (collectionInfo) {
      // Update collectionInfo with any changed values from collection
      let isUpdated = false;
      const updatedKeys: string[] = [];
      for (const key in collectionInfo) {
        if (
          key in collection &&
          collection[key as keyof typeof collection] !== undefined &&
          collection[key as keyof typeof collection] !==
            (collectionInfo as any)[key]
        ) {
          (collectionInfo as any)[key] =
            collection[key as keyof typeof collection];
          isUpdated = true;
          updatedKeys.push(key);
        }
      }
      if (isUpdated) {
        log.info("algoliaWriteCollection: Updating Collection", {
          collectionInfo,
          updatedKeys,
        });
        await algoliaWriteCollection(collectionInfo);
      }
    } else {
      await algoliaWriteCollection(collection);
    }
    return {
      status: 200,
      json: info,
    };
  } catch (error: any) {
    log.error("getTokenState catch", { error });
    return {
      status: 503,
      json: {
        error:
          "getTokenState error:" +
          (error?.message ?? (error ? String(error) : "unknown error")),
      },
    };
  }
}

export async function algoliaWriteNFT(info: NftInfo): Promise<boolean> {
  try {
    const objectID = info.collectionAddress + "." + info.tokenAddress;

    const data = {
      objectID,
      ...info,
    };

    const result = await client.saveObject({
      indexName,
      body: data,
    });
    if (result.taskID === undefined) {
      log.error("algoliaWriteNFT: Algolia write result is", result);
      return false;
    }

    return true;
  } catch (error) {
    log.error("algoliaWriteNFT error:", { error, info });
    return false;
  }
}

export async function algoliaWriteCollection(
  info: CollectionInfo
): Promise<boolean> {
  try {
    const objectID = info.collectionAddress;

    const data = {
      objectID,
      ...info,
    };

    const result = await client.saveObject({
      indexName,
      body: data,
    });
    if (result.taskID === undefined) {
      log.error("algoliaWriteCollection: Algolia write result is", result);
      return false;
    }

    return true;
  } catch (error) {
    log.error("algoliaWriteCollection error:", { error, info });
    return false;
  }
}

export async function algoliaGetNFT(params: {
  collectionAddress: string;
  nftAddress?: string;
}): Promise<NftInfo | CollectionInfo | undefined> {
  try {
    const { collectionAddress, nftAddress } = params;
    const objectID = collectionAddress + (nftAddress ? "." + nftAddress : "");

    const result = await client.getObject({
      indexName,
      objectID,
    });

    if (
      nftAddress &&
      result.tokenAddress === nftAddress &&
      result.collectionAddress === collectionAddress
    ) {
      return result as unknown as NftInfo;
    } else if (!nftAddress && result.collectionAddress === collectionAddress) {
      return result as unknown as CollectionInfo;
    } else {
      log.error("algoliaGetNFT: Unknown object type", {
        objectID,
        result,
        nftAddress,
        collectionAddress,
      });
      return undefined;
    }
  } catch (error) {
    log.error("algoliaGetNFT error:", { error, params });
    return undefined;
  }
}

async function getNftInfo(params: {
  nftAddress?: string;
  collectionAddress: string;
}): Promise<{ nft: NftInfo; collection: CollectionInfo } | undefined> {
  const { nftAddress, collectionAddress } = params;
  const collection = await getCollectionData({
    collection: collectionAddress,
  });
  if (!collection) {
    return undefined;
  }
  const { collection: collectionData, masterNft } = collection;
  const nft = nftAddress
    ? await getNFTData({
        address: nftAddress ?? collectionAddress,
        collection: collectionAddress,
        collectionName: collectionData.collectionName,
        collectionSymbol: collectionData.symbol,
        collectionUri: collectionData.uri,
        collectionBaseURL: collectionData.baseURL,
      })
    : masterNft;
  if (!nft) {
    return undefined;
  }
  return {
    nft,
    collection: collectionData,
  };
}

async function getNFTData(params: {
  address: string;
  collection: string;
  collectionName: string;
  collectionSymbol: string;
  collectionUri: string;
  collectionBaseURL: string;
}): Promise<NftInfo | undefined> {
  const { collectionBaseURL, collectionSymbol, collectionUri } = params;
  try {
    const address = PublicKey.fromBase58(params.address);
    const collection = PublicKey.fromBase58(params.collection);
    const tokenId = TokenId.derive(collection);
    await fetchMinaAccount({ publicKey: address, tokenId, force: false });
    if (!Mina.hasAccount(address)) {
      log.error("NFT account not found", {
        nftAddress: address.toBase58(),
      });
      return undefined;
    }
    const nft = new NFT(address, tokenId);
    const name = fieldToString(nft.name.get());
    const metadataRoot = nft.metadata.get().toJSON();
    const storage = nft.storage.get().toString();
    const ipfs = createIpfsURL({ hash: storage });
    const contractData = await getContractData({
      address,
      tokenId,
    });
    if (!contractData) {
      return undefined;
    }
    const { contractVerificationKeyHash, contractVersion, uri, symbol } =
      contractData;
    const response = await fetch(ipfs);
    if (!response.ok) {
      console.log("Failed to fetch metadata from IPFS");
      return undefined;
    }
    const metadata = await response.json();
    if (!metadata) {
      console.log("Failed to parse metadata from IPFS");
      return undefined;
    }
    const metadataVerificationKeyHash = nft.metadataVerificationKeyHash
      .get()
      .toJSON();
    const data = NFTData.unpack(nft.packedData.get());
    /*
class NFTData extends Struct({

  owner: PublicKey,
  approved: PublicKey,
  version: UInt32,
  id: UInt64,
  canChangeOwnerByProof: Bool,
  canTransfer: Bool,
  canApprove: Bool,
  canChangeMetadata: boolean;
  canChangeStorage: boolean;
  canChangeName: boolean;
  canChangeMetadataVerificationKeyHash: boolean;
  canPause: boolean;
  isPaused: boolean;
  requireOwnerAuthorizationToUpgrade: boolean;
}) 
  */
    if (!metadata.image) {
      console.error("No image found in metadata");
      return undefined;
    }
    if (typeof metadata.image !== "string") {
      console.error("Image url is not a string");
      return undefined;
    }
    if (!metadata.metadataRoot) {
      console.error("No metadataRoot found in metadata");
      return undefined;
    }
    if (typeof metadata.metadataRoot !== "string") {
      console.error("Metadata root is not a string");
      return undefined;
    }
    if (metadataRoot !== metadata.metadataRoot) {
      console.error("Metadata root does not match");
      return undefined;
    }
    if (!metadata.name) {
      console.error("No name found in metadata");
      return undefined;
    }
    if (typeof metadata.name !== "string") {
      console.error("Name is not a string");
      return undefined;
    }
    if (name !== metadata.name) {
      console.error("Name does not match");
      return undefined;
    }

    if (metadata.description && typeof metadata.description !== "string") {
      console.error("Description is not a string");
      return undefined;
    }
    const nftData: NftInfo = {
      type: "nft",
      tokenAddress: address.toBase58(),
      collectionName: params.collectionName,
      collectionAddress: params.collection,
      collectionBaseURL,
      collectionSymbol,
      collectionUri,
      symbol,
      uri,
      tokenId: TokenId.toBase58(tokenId),
      name,
      image: metadata.image,
      description: metadata.description,
      metadataRoot,
      storage,
      metadataVerificationKeyHash,
      owner: data.owner.toBase58(),
      approved: data.approved.equals(PublicKey.empty()).toBoolean()
        ? undefined
        : data.approved.toBase58(),
      version: Number(data.version.toBigint()),
      id: data.id.toBigInt().toString(),
      canChangeOwnerByProof: data.canChangeOwnerByProof.toBoolean(),
      canTransfer: data.canTransfer.toBoolean(),
      canApprove: data.canApprove.toBoolean(),
      canChangeMetadata: data.canChangeMetadata.toBoolean(),
      canChangeStorage: data.canChangeStorage.toBoolean(),
      canChangeName: data.canChangeName.toBoolean(),
      canChangeMetadataVerificationKeyHash:
        data.canChangeMetadataVerificationKeyHash.toBoolean(),
      canPause: data.canPause.toBoolean(),
      isPaused: data.isPaused.toBoolean(),
      requireOwnerAuthorizationToUpgrade:
        data.requireOwnerAuthorizationToUpgrade.toBoolean(),
      metadata,
      status: "created",
      rating: 100,
      created: Date.now(),
      updated: Date.now(),
      chain,
      contractVerificationKeyHash,
      contractVersion,
    };
    return nftData;
  } catch (error) {
    console.log("Failed to get NFT data", error);
    return undefined;
  }
}

async function getCollectionData(params: {
  collection: string;
}): Promise<{ collection: CollectionInfo; masterNft: NftInfo } | undefined> {
  try {
    const address = PublicKey.fromBase58(params.collection);
    await fetchMinaAccount({ publicKey: address, force: false });
    if (!Mina.hasAccount(address)) {
      log.error("Collection account not found", {
        collectionAddress: params.collection,
      });
      return undefined;
    }

    const contractData = await getContractData({
      address,
    });
    if (!contractData) {
      return undefined;
    }
    const { contractVerificationKeyHash, contractVersion, uri, symbol } =
      contractData;
    const collection = new Collection(address);
    const collectionName = fieldToString(collection.collectionName.get());
    const creator = collection.creator.get().toBase58();
    const adminAddress = collection.admin.get().toBase58();
    const data = CollectionData.unpack(collection.packedData.get());
    const baseURL = collection.baseURL.get().toString();
    const royaltyFee = Number(data.royaltyFee.toBigint());
    const transferFee = data.transferFee.toBigInt().toString();
    const requireTransferApproval = data.requireTransferApproval.toBoolean();
    const mintingIsLimited = data.mintingIsLimited.toBoolean();
    const collectionIsPaused = data.isPaused.toBoolean();

    const nftData = await getNFTData({
      address: params.collection,
      collection: params.collection,
      collectionName,
      collectionSymbol: symbol,
      collectionUri: uri,
      collectionBaseURL: baseURL,
    });
    if (!nftData) {
      log.error("Failed to get Master NFT data", {
        collectionAddress: params.collection,
      });
      return undefined;
    }
    nftData.type = "collection";
    const banner = (nftData.metadata as any).banner;
    if (banner && typeof banner !== "string") {
      log.error("Banner is not a string", {
        collectionAddress: params.collection,
      });
      return undefined;
    }
    const collectionData: CollectionInfo = {
      collectionName,
      collectionAddress: address.toBase58(),
      symbol,
      uri,
      banner,
      creator,
      adminAddress,
      baseURL,
      royaltyFee,
      transferFee,
      requireTransferApproval,
      mintingIsLimited,
      collectionIsPaused,
      contractVerificationKeyHash,
      contractVersion,
      tokenId: "",
      isPaused: collectionIsPaused,
      masterNFT: nftData,
      chain,
    };
    return {
      collection: collectionData,
      masterNft: nftData,
    };
  } catch (error) {
    log.error("Failed to get collection data", {
      collectionAddress: params.collection,
      error,
    });
    return undefined;
  }
}

async function getContractData({
  address,
  tokenId,
}: {
  address: PublicKey;
  tokenId?: Field;
}): Promise<
  | {
      contractVerificationKeyHash: string;
      contractVersion: number;
      uri: string;
      symbol: string;
    }
  | undefined
> {
  if (!Mina.hasAccount(address, tokenId)) {
    log.error("Contract account not found", {
      address: address.toBase58(),
      tokenId: tokenId ? TokenId.toBase58(tokenId) : undefined,
    });
    return undefined;
  }

  const account = Mina.getAccount(address);
  const contractVerificationKeyHash =
    account.zkapp?.verificationKey?.hash.toJSON();
  if (contractVerificationKeyHash === undefined) {
    log.error("getContractData: contract verification key hash not found", {
      address: address.toBase58(),
      tokenId: tokenId ? TokenId.toBase58(tokenId) : undefined,
    });
    return undefined;
  }
  const contractVersion = account.zkapp?.zkappVersion;
  if (contractVersion === undefined) {
    log.error("getContractData: contract version not found", {
      address: address.toBase58(),
      tokenId: tokenId ? TokenId.toBase58(tokenId) : undefined,
    });
    return undefined;
  }

  const uri = Mina.getAccount(address).zkapp?.zkappUri;
  if (!uri) {
    log.error("getContractData: no uri found", {
      address: address.toBase58(),
      tokenId: tokenId ? TokenId.toBase58(tokenId) : undefined,
    });
    return undefined;
  }
  const symbol = Mina.getAccount(address).tokenSymbol;
  if (!symbol) {
    log.error("getContractData: no symbol found", {
      address: address.toBase58(),
      tokenId: tokenId ? TokenId.toBase58(tokenId) : undefined,
    });
    return undefined;
  }

  return {
    contractVerificationKeyHash,
    contractVersion: Number(contractVersion.toBigint()),
    uri,
    symbol,
  };
}
