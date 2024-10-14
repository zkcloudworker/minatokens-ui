"use server";
import { fetchMinaAccount, initBlockchain, FungibleToken } from "zkcloudworker";
import { Mina, PublicKey, TokenId } from "o1js";
import { TokenInfo, DeployedTokenInfo } from "./token";
import { getTokenState } from "./state";
import { algoliaWriteToken } from "./algolia";
import { getChain, getChainId } from "./chain";

const chain = getChain();
const chainId = getChainId();

export async function verifyFungibleTokenState(params: {
  tokenContractAddress: string;
  adminContractAddress: string;
  adminAddress: string;
  info: TokenInfo;
  created: number;
  updated: number;
  tokenId: string;
}): Promise<boolean> {
  const {
    tokenContractAddress,
    adminContractAddress,
    adminAddress,
    info,
    created,
    updated,
    tokenId,
  } = params;
  try {
    await initBlockchain(chain);
    const tokenContractPublicKey = PublicKey.fromBase58(tokenContractAddress);
    const adminContractPublicKey = PublicKey.fromBase58(adminContractAddress);
    const adminPublicKey = PublicKey.fromBase58(adminAddress);
    const tokenContract = new FungibleToken(tokenContractPublicKey);
    const tokenIdCheck = tokenContract.deriveTokenId();
    if (TokenId.toBase58(tokenIdCheck) !== tokenId) {
      console.error("verifyFungibleTokenState: Token ID does not match", {
        tokenIdCheck: TokenId.toBase58(tokenIdCheck),
        tokenId,
      });
      return false;
    }
    await fetchMinaAccount({ publicKey: tokenContractPublicKey, force: false });
    await fetchMinaAccount({
      publicKey: tokenContractPublicKey,
      tokenId,
      force: false,
    });
    await fetchMinaAccount({ publicKey: adminContractPublicKey, force: false });
    await fetchMinaAccount({ publicKey: adminPublicKey, force: false });
    if (!Mina.hasAccount(adminPublicKey)) {
      console.error("verifyFungibleTokenState: Admin account not found");
      return false;
    }
    if (!Mina.hasAccount(adminContractPublicKey)) {
      console.error(
        "verifyFungibleTokenState: Admin contract account not found",
        {
          adminContractAddress,
        }
      );
      return false;
    }
    if (!Mina.hasAccount(tokenContractPublicKey)) {
      console.error(
        "verifyFungibleTokenState: Token contract account not found",
        {
          tokenContractAddress,
        }
      );
      return false;
    }
    if (!Mina.hasAccount(tokenContractPublicKey, tokenIdCheck)) {
      console.error(
        "verifyFungibleTokenState: Token contract totalSupply account not found",
        {
          tokenContractAddress,
        }
      );
      return false;
    }
    const adminContractAccount = tokenContract.admin.get();
    if (adminContractAccount.toBase58() !== adminContractAddress) {
      console.error(
        "verifyFungibleTokenState: Admin contract address does not match",
        {
          adminContractAddress,
          adminContractAccount: adminContractAccount.toBase58(),
        }
      );
      return false;
    }
    const adminContract = Mina.getAccount(adminContractPublicKey);
    const adminAddressCheck0 = adminContract.zkapp?.appState[0];
    const adminAddressCheck1 = adminContract.zkapp?.appState[1];
    if (adminAddressCheck0 === undefined || adminAddressCheck1 === undefined) {
      console.error(
        "verifyFungibleTokenState: Cannot fetch admin address from admin contract",
        {
          adminContractAddress,
          adminContractPublicKey: adminContractPublicKey.toBase58(),
        }
      );
      return false;
    }
    const adminAddressCheck = PublicKey.fromFields([
      adminAddressCheck0,
      adminAddressCheck1,
    ]);
    if (adminAddressCheck.toBase58() !== adminAddress) {
      console.error("verifyFungibleTokenState: Admin address does not match", {
        adminAddressCheck: adminAddressCheck.toBase58(),
        adminAddress: adminAddress,
      });
      return false;
    }
    const tokenState = await getTokenState({
      tokenAddress: tokenContractPublicKey.toBase58(),
    });
    if (!tokenState.success) {
      console.error("verifyFungibleTokenState: getTokenState failed", {
        tokenState,
      });
      return false;
    }

    const deployedTokenInfo: DeployedTokenInfo = {
      ...info,
      ...tokenState.tokenState,
      created,
      updated,
      chain: chainId,
    };

    const writeResult = await algoliaWriteToken({
      tokenAddress: tokenContractPublicKey.toBase58(),
      info: deployedTokenInfo,
    });
    if (!writeResult) {
      console.error("verifyFungibleTokenState: algoliaWriteToken failed", {
        tokenAddress: tokenContractPublicKey.toBase58(),
        info,
      });
    }
    return true;
  } catch (error) {
    console.error("verifyFungibleTokenState: catch", error);
    return false;
  }
}

export async function getTokenBalance(params: {
  tokenContractAddress: string;
  address: string;
}): Promise<{ success: boolean; balance?: number; error?: string }> {
  const { tokenContractAddress, address } = params;
  try {
    await initBlockchain(chain);
    const tokenContractPublicKey = PublicKey.fromBase58(tokenContractAddress);
    const publicKey = PublicKey.fromBase58(address);
    const tokenContract = new FungibleToken(tokenContractPublicKey);
    const tokenId = tokenContract.deriveTokenId();
    await fetchMinaAccount({
      publicKey,
      tokenId,
      force: false,
    });
    if (!Mina.hasAccount(tokenContractPublicKey, tokenId)) {
      console.error("getTokenBalance: Token contract user account not found", {
        tokenContractAddress,
        address,
      });
      return { success: false, error: "User account don't have tokens" };
    }
    const balance = Number(
      Mina.getAccount(publicKey, tokenId).balance.toBigInt()
    );
    return { success: true, balance };
  } catch (error: any) {
    console.error("getTokenBalance: catch", error);
    return { success: false, error: error?.message ?? "cannot fetch balance" };
  }
}
