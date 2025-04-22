"use server";
import assert from "assert";
import { PrismaClient, Chain as PrismaChain } from "@prisma/client";
import Client from "mina-signer";
import { CmsnftData } from "@silvana-one/api";
import { ApiName, ApiResponse } from "../api-types";
import { getChain, getPrismaChainName } from "@/lib/chain";
import { log as logtail } from "@logtail/next";
import { getNftInfo } from "../info/nft-info";

const chain = getChain();
const prismaChain = getPrismaChainName();
const log = logtail.with({
  service: "api",
  function: "cms",
  chain,
});

const client = new Client({
  network: "testnet",
});

const prisma = new PrismaClient({
  datasourceUrl: process.env.POSTGRES_PRISMA_URL,
});

export interface CmsStoreNFTParams {
  signature: string;
  nft: CmsnftData;
}

export interface CmsStoreNFTResponse {
  success: boolean;
}

export interface CmsReadNFTParams {
  collectionAddress: string;
  nftName?: string;
  signature?: string;
}

export interface CmsReadNFTResponse {
  nfts: CmsnftData[];
}

export interface CmsReserveNFTParams {
  collectionAddress: string;
  nftName: string;
  reserve: boolean;
  signature?: string;
}

export interface CmsReserveNFTResponse {
  reserved: boolean;
  nft: CmsnftData;
}

export interface CmsSignature {
  data: string;
  field: string;
  scalar: string;
  expiry: number;
  publicKey: string;
}

export interface CmsStoreSignatureData {
  nft: CmsnftData;
  expiry: number;
}

export interface CmsReadSignatureData {
  collectionAddress: string;
  nftName?: string;
  expiry: number;
}

export interface CmsReserveSignatureData {
  collectionAddress: string;
  nftName: string;
  reserve?: boolean;
  expiry: number;
}

export async function cmsStoreNFT(props: {
  params: CmsStoreNFTParams;
  name: ApiName;
  apiKeyAddress: string;
}): Promise<ApiResponse<CmsStoreNFTResponse>> {
  try {
    const { params, name, apiKeyAddress } = props;
    const { signature, nft } = params;
    const signatureJson: CmsSignature = JSON.parse(signature);
    if (
      !signatureJson ||
      !signatureJson.data ||
      !signatureJson.field ||
      !signatureJson.scalar ||
      !signatureJson.expiry ||
      !signatureJson.publicKey ||
      typeof signatureJson.data !== "string" ||
      typeof signatureJson.field !== "string" ||
      typeof signatureJson.scalar !== "string" ||
      typeof signatureJson.expiry !== "number" ||
      typeof signatureJson.publicKey !== "string"
    ) {
      return {
        status: 400,
        json: { error: "Invalid signature json" },
      };
    }
    if (signatureJson.expiry < Date.now()) {
      return {
        status: 400,
        json: { error: "Signature expired" },
      };
    }

    const signatureData: CmsStoreSignatureData = JSON.parse(signatureJson.data);
    if (
      !signatureData ||
      !signatureData.nft ||
      !signatureData.expiry ||
      typeof signatureData.nft !== "object" ||
      typeof signatureData.expiry !== "number"
    ) {
      return {
        status: 400,
        json: { error: "Invalid signature data" },
      };
    }

    if (signatureData.expiry !== signatureJson.expiry) {
      return {
        status: 400,
        json: { error: "Invalid signature expiry" },
      };
    }

    // Compare signatureData.nft and nft using deep equality check that ignores property order

    try {
      assert.deepStrictEqual(signatureData.nft, nft);
    } catch (error) {
      return {
        status: 400,
        json: {
          error: "NFT data in signature does not match provided NFT data",
        },
      };
    }

    const isValid = client.verifyMessage({
      data: signatureJson.data,
      signature: { field: signatureJson.field, scalar: signatureJson.scalar },
      publicKey: signatureJson.publicKey,
    });
    if (!isValid) {
      return {
        status: 400,
        json: { error: "Invalid signature" },
      };
    }

    const collectionInfo = await getNftInfo({
      collectionAddress: nft.collectionAddress,
    });
    if (!collectionInfo) {
      return {
        status: 400,
        json: { error: "Collection not found" },
      };
    }
    if (collectionInfo?.collection?.creator !== signatureJson?.publicKey) {
      return {
        status: 400,
        json: {
          error:
            "The creator of the collection is not the same as the person who signed the message",
        },
      };
    }

    const savedNft = await prisma.nFTCMS.create({
      data: {
        ...nft,
        chain: prismaChain as PrismaChain,
        traits: nft.traits ? JSON.stringify({ traits: nft.traits }) : undefined,
        mintStart: nft.mintStart ? new Date(nft.mintStart) : undefined,
        mintEnd: nft.mintEnd ? new Date(nft.mintEnd) : undefined,
        nftData: nft.nftData ? JSON.stringify(nft.nftData) : undefined,
      },
    });

    console.log("saved NFT to CMS with id", savedNft.id);

    return {
      status: 200,
      json: { success: true },
    };
  } catch (error: any) {
    log.error("Error verifying signature", { error });
    return {
      status: 400,
      json: { error: error?.message },
    };
  }
}

export async function cmsReadNFT(props: {
  params: CmsReadNFTParams;
  name: ApiName;
  apiKeyAddress: string;
}): Promise<ApiResponse<CmsReadNFTResponse>> {
  try {
    const { params, name, apiKeyAddress } = props;
    const { collectionAddress, nftName, signature } = params;
    let isSigned = false;
    if (signature) {
      const signatureJson: CmsSignature = JSON.parse(signature);
      if (
        !signatureJson ||
        !signatureJson.data ||
        !signatureJson.field ||
        !signatureJson.scalar ||
        !signatureJson.expiry ||
        !signatureJson.publicKey ||
        typeof signatureJson.data !== "string" ||
        typeof signatureJson.field !== "string" ||
        typeof signatureJson.scalar !== "string" ||
        typeof signatureJson.expiry !== "number" ||
        typeof signatureJson.publicKey !== "string"
      ) {
        return {
          status: 400,
          json: { error: "Invalid signature json" },
        };
      }
      if (signatureJson.expiry < Date.now()) {
        return {
          status: 400,
          json: { error: "Signature expired" },
        };
      }

      const signatureData: CmsReadSignatureData = JSON.parse(
        signatureJson.data
      );
      if (
        !signatureData ||
        !signatureData.collectionAddress ||
        !signatureData.expiry ||
        typeof signatureData.collectionAddress !== "string" ||
        typeof signatureData.expiry !== "number"
      ) {
        return {
          status: 400,
          json: { error: "Invalid signature data" },
        };
      }

      if (signatureData.expiry !== signatureJson.expiry) {
        return {
          status: 400,
          json: { error: "Invalid signature expiry" },
        };
      }

      if (signatureData.collectionAddress !== collectionAddress) {
        return {
          status: 400,
          json: { error: "Invalid collection address" },
        };
      }

      if (signatureData.nftName && signatureData.nftName !== nftName) {
        return {
          status: 400,
          json: { error: "Invalid NFT name" },
        };
      }

      const isValid = client.verifyMessage({
        data: signatureJson.data,
        signature: { field: signatureJson.field, scalar: signatureJson.scalar },
        publicKey: signatureJson.publicKey,
      });
      if (!isValid) {
        return {
          status: 400,
          json: { error: "Invalid signature" },
        };
      }

      const collectionInfo = await getNftInfo({
        collectionAddress,
      });
      if (!collectionInfo) {
        return {
          status: 400,
          json: { error: "Collection not found" },
        };
      }
      if (collectionInfo?.collection?.creator !== signatureJson?.publicKey) {
        return {
          status: 400,
          json: {
            error:
              "The creator of the collection is not the same as the person who signed the message",
          },
        };
      }
      isSigned = true;
    }

    const savedNfts = await prisma.nFTCMS.findMany({
      where: {
        collectionAddress,
        ...(nftName ? { name: nftName } : {}),
        // TODO: add on mainnet launch mintDate range filter using mintStart and mintEnd and isSigned
      },
    });

    const nfts: CmsnftData[] = savedNfts.map((nft) => {
      return {
        ...nft,
        traits: nft.traits ? JSON.parse(nft.traits as string) : undefined,
        symbol: nft.symbol || undefined,
        nftData: nft.nftData ? JSON.parse(nft.nftData as string) : undefined,
        description: nft.description || undefined,
        mintStart: nft.mintStart ? nft.mintStart.valueOf() : undefined,
        mintEnd: nft.mintEnd ? nft.mintEnd.valueOf() : undefined,
        price: nft.price || undefined,
      };
    });

    return {
      status: 200,
      json: { nfts },
    };
  } catch (error: any) {
    log.error("Error verifying signature", { error });
    return {
      status: 400,
      json: { error: error?.message },
    };
  }
}

export async function cmsReserveNFT(props: {
  params: CmsReserveNFTParams;
  name: ApiName;
  apiKeyAddress: string;
}): Promise<ApiResponse<CmsReserveNFTResponse>> {
  return {
    status: 400,
    json: {
      error:
        "Contact support@minanft.io to enable reserve feature for your collection",
    },
  };
}
