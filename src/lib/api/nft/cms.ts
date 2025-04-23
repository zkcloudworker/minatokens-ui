"use server";
import assert from "assert";
import { PrismaClient, Chain as PrismaChain } from "@prisma/client";
import Client from "mina-signer";
import { CmsnftData } from "@silvana-one/api";
import { ApiName, ApiResponse } from "../api-types";
import { getChain, getPrismaChainName } from "@/lib/chain";
import { log as logtail } from "@logtail/next";
import { getNftInfo } from "../info/nft-info";
import { initBlockchain, fetchMinaAccount } from "@/lib/blockchain";
import { checkAddress } from "@/lib/address";

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
  console.log("cmsStoreNFT", props);
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

    await initBlockchain();
    if (!checkAddress(nft.collectionAddress)) {
      return {
        status: 400,
        json: { error: "Invalid collection address" },
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

      await initBlockchain();
      if (!checkAddress(collectionAddress)) {
        return {
          status: 400,
          json: { error: "Invalid collection address" },
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
        chain: prismaChain as PrismaChain,
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

const reserveQuestionary = `
  Questionary for Collection Creator for implementing reserve feature for collection:

  - Mint start date and time
  - Mint end date and time
  - What address should receive mint fees. Can it be the creator address or NFTadmin admin address?
  - Max number of NFTs per address (public key B62...)
  - Max number of NFTs per ip address
  - Max mint rate per minute and per hour
  - Whitelist of addresses that are allowed to mint
  - Blacklist of addresses that are not allowed to mint
  - Blacklist of ip addresses that are not allowed to mint
  - List of allowed countries (by country code)
  - List of not allowed countries (by country code)
  - Should be fully decentralized mint using token accounts of admin contract? (will cost 1.2 MINA per NFT in advance for network fees for creation of token accounts in advance, or pre-generated private keys for all NFTs can be used) or should use centralized sequencer with rate limits (no upfront cost)
  - Should be minted NFTs shown to user after mint request or after the inclusion in the block (can take few hours in case of airdrop)
  - What methods should be used for nonce management: graphql, blockberry, redis, increment with timeouts (affect fail rate of mint)
  - Will the mint be sent by the one address in case of airdrop of should txs be signed by users
  - Who is paying network fees
  - Should the address and the private key be generated on saving the NFT to the CMS. Where NFT private key should be stored
  - What progress info should see the user after mint request. Should it be cached in case of mint taking several hours?

  Please answer the questions above and send to support@minanft.io. 
  If you have any questions, need help or would like to discuss the implementation details, please contact us.
`;

export async function cmsReserveNFT(props: {
  params: CmsReserveNFTParams;
  name: ApiName;
  apiKeyAddress: string;
}): Promise<ApiResponse<CmsReserveNFTResponse>> {
  return {
    status: 400,
    json: {
      error:
        "Contact support@minanft.io to enable reserve feature for your collection, answering the questions:" +
        reserveQuestionary,
    },
  };
}
