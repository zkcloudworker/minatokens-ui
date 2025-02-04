"use server";
import { fetchMinaAccount, initBlockchain } from "@/lib/blockchain";
import {
  FungibleToken,
  FungibleTokenBondingCurveAdmin,
  BondingCurveParams,
} from "@minatokens/token";
import { tokenVerificationKeys } from "@minatokens/abi";
import { Mina, PublicKey, Bool, TokenId } from "o1js";
import { TokenState, DeployedTokenInfo, TokenInfo } from "./token";
import { algoliaGetToken, algoliaWriteToken } from "@/lib/algolia";
import { getChainId } from "@/lib/chain";
import { debug } from "@/lib/debug";
import { log as logtail } from "@logtail/next";
const chainId = getChainId();
const log = logtail.with({
  chainId,
  service: "state",
});
const DEBUG = debug();

export async function getTokenState(params: {
  tokenAddress: string;
  info?: DeployedTokenInfo;
}): Promise<
  | {
      success: true;
      tokenState: TokenState;
      info: DeployedTokenInfo;
      isStateUpdated: boolean;
    }
  | {
      success: false;
      error: string;
    }
> {
  const { tokenAddress, info } = params;
  try {
    await initBlockchain();
    const tokenContractPublicKey = PublicKey.fromBase58(tokenAddress);
    const tokenContract = new FungibleToken(tokenContractPublicKey);

    await fetchMinaAccount({ publicKey: tokenContractPublicKey, force: false });
    if (!Mina.hasAccount(tokenContractPublicKey)) {
      if (DEBUG)
        console.error("getTokenState: Token contract account not found", {
          tokenAddress,
        });
      return { success: false, error: "Token contract account not found" };
    }
    const tokenId = tokenContract.deriveTokenId();
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

    const adminContractPublicKey = tokenContract.admin.get();
    const decimals = tokenContract.decimals.get().toNumber();
    const isPaused = (tokenContract.paused.get() as Bool).toBoolean();
    const totalSupply =
      Number(Mina.getBalance(tokenContractPublicKey, tokenId).toBigInt()) /
      1_000_000_000;
    const account = Mina.getAccount(tokenContractPublicKey);
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
      log.error("getTokenState: Token verification key hash not found", {
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
      log.error(
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
    const vk =
      tokenVerificationKeys[chainId === "mina:mainnet" ? "mainnet" : "devnet"]
        .vk;
    let adminType = "unknown" as
      | "standard"
      | "advanced"
      | "bondingCurve"
      | "unknown";
    if (adminVerificationKeyHash === vk.FungibleTokenAdmin.hash) {
      adminType = "standard";
    } else if (
      adminVerificationKeyHash === vk.FungibleTokenAdvancedAdmin.hash
    ) {
      adminType = "advanced";
    } else if (
      adminVerificationKeyHash === vk.FungibleTokenBondingCurveAdmin.hash
    ) {
      adminType = "bondingCurve";
    }
    const prices =
      adminType === "bondingCurve"
        ? await getPrice(adminContractPublicKey)
        : undefined;
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
    } catch (error) {
      // console.log("getTokenState: Cannot fetch admin token balance", {
      //   adminAddress: adminAddress.toBase58(),
      // });
    }

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
      adminType,
      mintPrice: prices?.mintPrice,
      redeemPrice: prices?.redeemPrice,
    };
    const { isStateUpdated, info: tokenInfo } = await updateTokenInfo({
      tokenAddress,
      tokenState,
      info,
    });

    return {
      success: true,
      tokenState,
      isStateUpdated,
      info: tokenInfo,
    };
  } catch (error: any) {
    log.error("getTokenState: catch", { error });
    return {
      success: false,
      error: "getTokenState catch:" + (error?.message ?? String(error)),
    };
  }
}

export async function updateTokenInfo(params: {
  tokenAddress: string;
  tokenState: TokenState;
  info?: DeployedTokenInfo;
}): Promise<{ isStateUpdated: boolean; info: DeployedTokenInfo }> {
  const { tokenAddress, tokenState, info } = params;
  let tokenInfo = info;
  let isStateUpdated = false;
  let needUpdateState = false;
  if (tokenInfo === undefined) {
    tokenInfo = await algoliaGetToken({
      tokenAddress,
    });
  }
  if (tokenInfo === undefined) {
    console.log("getTokenState: Token info not found", {
      tokenAddress,
    });
    tokenInfo = await restoreDeployedTokenInfo({ tokenState });
    needUpdateState = true;
  }

  if (
    needUpdateState ||
    tokenInfo.adminContractAddress !== tokenState.adminContractAddress ||
    tokenInfo.adminAddress !== tokenState.adminAddress ||
    tokenInfo.totalSupply !== tokenState.totalSupply ||
    tokenInfo.isPaused !== tokenState.isPaused ||
    tokenInfo.decimals !== tokenState.decimals ||
    tokenInfo.chain === undefined ||
    tokenInfo.created === undefined ||
    tokenInfo.updated === undefined ||
    tokenInfo.rating === undefined ||
    tokenInfo.status === undefined ||
    tokenInfo.tokenId !== tokenState.tokenId ||
    tokenInfo.adminType !== tokenState.adminType ||
    tokenInfo.mintPrice !== tokenState.mintPrice ||
    tokenInfo.redeemPrice !== tokenState.redeemPrice
  ) {
    console.log("getTokenState: Token info mismatch, updating the info", {
      tokenAddress,
      tokenInfo,
      tokenState,
    });
    tokenInfo.tokenId = tokenState.tokenId;
    tokenInfo.adminContractAddress = tokenState.adminContractAddress;
    tokenInfo.adminAddress = tokenState.adminAddress;
    tokenInfo.totalSupply = tokenState.totalSupply;
    tokenInfo.isPaused = tokenState.isPaused;
    tokenInfo.decimals = tokenState.decimals;
    tokenInfo.adminType = tokenState.adminType;
    tokenInfo.mintPrice = tokenState.mintPrice;
    tokenInfo.redeemPrice = tokenState.redeemPrice;
    tokenInfo.updated = Date.now();
    if (!tokenInfo.created) tokenInfo.created = tokenInfo.updated;
    if (!tokenInfo.chain) tokenInfo.chain = chainId;
    if (tokenInfo.rating === undefined) tokenInfo.rating = 100;
    if (tokenInfo.status === undefined) tokenInfo.status = "created";
    console.log("Updating token info", { tokenInfo });
    await algoliaWriteToken({
      tokenAddress,
      info: tokenInfo,
    });
    isStateUpdated = true;
  }

  return { isStateUpdated, info: tokenInfo };
}

/*
export interface TokenInfo {
  symbol: string;
  name: string;
  description?: string;
  image?: string;
  twitter: string;
  discord: string;
  telegram: string;
  instagram: string;
  facebook: string;
  website: string;
  tokenContractCode?: string;
  adminContractsCode?: string[];
  data?: object;
  isMDA?: boolean;
  launchpad?: string;
}

export interface TokenState {
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

export interface DeployedTokenInfo extends TokenInfo, TokenState {
  created: number;
  updated: number;
  chain: string;
  likes?: number;
}
*/
export async function restoreDeployedTokenInfo(params: {
  tokenState: TokenState;
}): Promise<DeployedTokenInfo> {
  const { tokenState } = params;
  const time = Date.now();
  let info: TokenInfo = {
    symbol: tokenState.tokenSymbol,
    name: tokenState.tokenSymbol,
  };
  try {
    const uri = tokenState.uri;
    let json: object | undefined;
    let isImage = false;
    if (uri && typeof uri === "string" && uri.startsWith("http")) {
      const response = await fetch(uri);
      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        try {
          json = await response.json();
        } catch (e) {
          console.error("restoreDeployedTokenInfo: Cannot parse json", e);
        }
      } else if (contentType?.includes("image/")) {
        isImage = true;
      } else {
        try {
          json = await response.json();
        } catch (e) {}
        if (json === undefined) {
          try {
            const data = await response.text();
            // Check if data starts with common image data URI prefixes
            isImage =
              data.startsWith("data:image/") ||
              /^iVBORw0KGgo/.test(data) || // PNG
              /^\/9j\//.test(data) || // JPG
              /^R0lGOD/.test(data) || // GIF
              /^Qk/.test(data); // BMP
          } catch (e) {}
        }
      }
      if (isImage) {
        info.image = uri;
      } else if (json) {
        info = json as TokenInfo;
      }
    }
  } catch (e) {
    log.error("restoreDeployedTokenInfo: catch", { error: e });
  }
  const deployedTokenInfo: DeployedTokenInfo = {
    ...info,
    ...tokenState,
    symbol: tokenState.tokenSymbol,
    name: info.name ?? tokenState.tokenSymbol,
    created: time,
    updated: time,
    chain: chainId,
    rating: 100,
  };
  return deployedTokenInfo;
}

async function getPrice(adminAddress: PublicKey): Promise<{
  redeemPrice: number;
  mintPrice: number;
}> {
  const adminContract = new FungibleTokenBondingCurveAdmin(adminAddress);
  const tokenId = adminContract.deriveTokenId();
  await fetchMinaAccount({
    publicKey: adminAddress,
    tokenId,
  });
  const supply = Mina.getAccount(adminAddress, tokenId).balance.toBigInt();
  const balance = Mina.getAccount(adminAddress).balance.toBigInt();
  const redeemPrice =
    supply === 0n ? 10_000 : (balance * 1_000_000_000n) / supply;
  const mintPrice = 10_000 + Math.ceil(Number(supply) / 10_000_000_000_000);
  return {
    redeemPrice: (Number(redeemPrice) * 0.9) / 1_000_000_000,
    mintPrice: (Number(mintPrice) * 1.1) / 1_000_000_000,
  };
}
