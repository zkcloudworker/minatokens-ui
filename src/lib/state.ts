"use server";
import { fetchMinaAccount, initBlockchain } from "./blockchain";
import { FungibleToken } from "./api/zkcloudworker/token";
import { Mina, PublicKey, Bool, TokenId } from "o1js";
import { TokenState, DeployedTokenInfo } from "./token";
import { algoliaGetToken, algoliaWriteToken } from "./algolia";
import { getChain, getChainId } from "./chain";
import { debug } from "./debug";
const DEBUG = debug();
const chain = getChain();
const chainId = getChainId();

export async function getTokenState(params: {
  tokenAddress: string;
  info?: DeployedTokenInfo;
}): Promise<
  | {
      success: true;
      tokenState: TokenState;
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
    };
    let tokenInfo = info;
    let isStateUpdated = false;
    if (tokenInfo === undefined) {
      tokenInfo = await algoliaGetToken({
        tokenAddress: tokenContractPublicKey.toBase58(),
      });
    }
    if (tokenInfo === undefined) {
      console.error("getTokenState: Token info not found", {
        tokenAddress,
      });
    } else {
      if (
        tokenInfo.adminContractAddress !== tokenState.adminContractAddress ||
        tokenInfo.adminAddress !== tokenState.adminAddress ||
        tokenInfo.totalSupply !== tokenState.totalSupply ||
        tokenInfo.isPaused !== tokenState.isPaused ||
        tokenInfo.decimals !== tokenState.decimals ||
        tokenInfo.chain === undefined ||
        tokenInfo.created === undefined ||
        tokenInfo.updated === undefined ||
        tokenInfo.tokenId !== tokenState.tokenId
      ) {
        console.error("getTokenState: Token info mismatch, updating the info", {
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
        tokenInfo.updated = Date.now();
        if (!tokenInfo.created) tokenInfo.created = tokenInfo.updated;
        if (!tokenInfo.chain) tokenInfo.chain = chainId;
        console.log("Updating token info", { tokenInfo });
        await algoliaWriteToken({
          tokenAddress: tokenContractPublicKey.toBase58(),
          info: tokenInfo,
        });
        isStateUpdated = true;
      }
    }
    return {
      success: true,
      tokenState,
      isStateUpdated,
    };
  } catch (error: any) {
    console.error("getTokenState catch", error);
    return {
      success: false,
      error: "getTokenState catch:" + (error?.message ?? String(error)),
    };
  }
}
