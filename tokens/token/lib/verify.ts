"use server";
import { fetchMinaAccount } from "zkcloudworker";
import { initBlockchain } from "@/lib/blockchain";
import { FungibleToken } from "@minatokens/token";
import { Mina, PublicKey, TokenId, fetchAccount } from "o1js";
import { TokenInfo, DeployedTokenInfo } from "./token";
import { getTokenState } from "./state";
import { algoliaWriteToken } from "@/lib/algolia";
import { getChainId } from "@/lib/chain";
import { log as logtail } from "@logtail/next";
const chainId = getChainId();
const log = logtail.with({
  chainId,
  service: "verify",
});

export async function verifyFungibleTokenState(params: {
  tokenContractAddress: string;
  adminContractAddress: string;
  adminAddress: string;
  info: TokenInfo;
  created: number;
  updated: number;
  tokenId: string;
  rating: number;
  status: string;
}): Promise<boolean> {
  const {
    tokenContractAddress,
    adminContractAddress,
    adminAddress,
    info,
    created,
    updated,
    tokenId,
    rating,
    status,
  } = params;
  try {
    await initBlockchain();
    const tokenContractPublicKey = PublicKey.fromBase58(tokenContractAddress);
    const adminContractPublicKey = PublicKey.fromBase58(adminContractAddress);
    const adminPublicKey = PublicKey.fromBase58(adminAddress);
    const tokenContract = new FungibleToken(tokenContractPublicKey);
    const tokenIdCheck = tokenContract.deriveTokenId();
    if (TokenId.toBase58(tokenIdCheck) !== tokenId) {
      log.error("verifyFungibleTokenState: Token ID does not match", {
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
      log.error("verifyFungibleTokenState: Admin account not found");
      return false;
    }
    if (!Mina.hasAccount(adminContractPublicKey)) {
      log.error("verifyFungibleTokenState: Admin contract account not found", {
        adminContractAddress,
      });
      return false;
    }
    if (!Mina.hasAccount(tokenContractPublicKey)) {
      log.error("verifyFungibleTokenState: Token contract account not found", {
        tokenContractAddress,
      });
      return false;
    }
    if (!Mina.hasAccount(tokenContractPublicKey, tokenIdCheck)) {
      log.error(
        "verifyFungibleTokenState: Token contract totalSupply account not found",
        {
          tokenContractAddress,
        }
      );
      return false;
    }
    const adminContractAccount = tokenContract.admin.get();
    if (adminContractAccount.toBase58() !== adminContractAddress) {
      log.error(
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
      log.error(
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
      log.error("verifyFungibleTokenState: Admin address does not match", {
        adminAddressCheck: adminAddressCheck.toBase58(),
        adminAddress: adminAddress,
      });
      return false;
    }
    const tokenState = await getTokenState({
      tokenAddress: tokenContractPublicKey.toBase58(),
    });
    if (!tokenState.success) {
      log.error("verifyFungibleTokenState: getTokenState failed", {
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
      rating,
      status,
    };

    const writeResult = await algoliaWriteToken({
      tokenAddress: tokenContractPublicKey.toBase58(),
      info: deployedTokenInfo,
    });
    if (!writeResult) {
      log.error("verifyFungibleTokenState: algoliaWriteToken failed", {
        tokenAddress: tokenContractPublicKey.toBase58(),
        info,
      });
    }
    return true;
  } catch (error) {
    log.error("verifyFungibleTokenState: catch", { error });
    return false;
  }
}

// export async function getTokenBalance(params: {
//   tokenContractAddress: string;
//   address: string;
// }): Promise<{ success: boolean; balance?: number; error?: string }> {
//   const { tokenContractAddress, address } = params;
//   try {
//     await initBlockchain();
//     const tokenContractPublicKey = PublicKey.fromBase58(tokenContractAddress);
//     const publicKey = PublicKey.fromBase58(address);
//     const tokenContract = new FungibleToken(tokenContractPublicKey);
//     const tokenId = tokenContract.deriveTokenId();
//     try {
//       await fetchAccount({
//         publicKey,
//         tokenId,
//       });
//     } catch (error) {
//       console.error("getTokenBalance: fetchAccount failed", {
//         error,
//         tokenContractAddress,
//         address,
//         tokenId: TokenId.toBase58(tokenId),
//       });
//       return { success: false, error: "getTokenBalance: fetchAccount failed" };
//     }
//     if (!Mina.hasAccount(tokenContractPublicKey, tokenId)) {
//       console.error("getTokenBalance: Token contract user account not found", {
//         tokenContractAddress,
//         address,
//         tokenId: TokenId.toBase58(tokenId),
//       });
//       return {
//         success: false,
//         error: "getTokenBalance: Token contract user account not found",
//       };
//     }
//     const balance = Number(
//       Mina.getAccount(publicKey, tokenId).balance.toBigInt()
//     );
//     return { success: true, balance };
//   } catch (error: any) {
//     console.error("getTokenBalance: catch", error, {
//       tokenContractAddress,
//       address,
//     });
//     return { success: false, error: error?.message ?? "cannot fetch balance" };
//   }
// }
