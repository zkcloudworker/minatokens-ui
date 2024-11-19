"use server";
import { Mina, PublicKey, Bool, TokenId, Struct, UInt8 } from "o1js";
import { initBlockchain, fetchMinaAccount } from "@/lib/blockchain";
import { ApiResponse, TokenSymbolAndAdmin } from "./types";
import { checkAddress } from "./address";

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

export async function getTokenSymbolAndAdmin(params: {
  tokenAddress: string;
}): Promise<ApiResponse<TokenSymbolAndAdmin>> {
  const { tokenAddress } = params;
  try {
    await initBlockchain();
    if (!checkAddress(tokenAddress)) {
      return {
        status: 400,
        json: { error: "Invalid token address" },
      };
    }
    const tokenContractPublicKey = PublicKey.fromBase58(tokenAddress);

    await fetchMinaAccount({ publicKey: tokenContractPublicKey, force: false });
    if (!Mina.hasAccount(tokenContractPublicKey)) {
      return {
        status: 400,
        json: { error: "Token contract account not found" },
      };
    }

    const account = Mina.getAccount(tokenContractPublicKey);
    if (account.zkapp?.appState === undefined) {
      console.error("getTokenState: Token contract state not found", {
        tokenAddress,
      });
      return {
        status: 400,
        json: { error: "Token contract state not found" },
      };
    }
    const state = FungibleTokenState.fromFields(
      account.zkapp?.appState.slice(0, FungibleTokenStateSize)
    );
    const tokenSymbol = account.tokenSymbol;
    const adminContractPublicKey = state.admin;
    await fetchMinaAccount({ publicKey: adminContractPublicKey, force: false });
    if (!Mina.hasAccount(adminContractPublicKey)) {
      console.error("getTokenState: Admin contract account not found", {
        tokenAddress,
      });
      return {
        status: 400,
        json: { error: "Admin contract account not found" },
      };
    }

    const adminContract = Mina.getAccount(adminContractPublicKey);
    const adminAddress0 = adminContract.zkapp?.appState[0];
    const adminAddress1 = adminContract.zkapp?.appState[1];
    if (adminAddress0 === undefined || adminAddress1 === undefined) {
      console.error("Cannot fetch admin address from admin contract");
      return {
        status: 400,
        json: { error: "Cannot fetch admin address from admin contract" },
      };
    }
    const adminAddress = PublicKey.fromFields([adminAddress0, adminAddress1]);

    const tokenState: TokenSymbolAndAdmin = {
      tokenAddress: tokenContractPublicKey.toBase58(),
      adminContractAddress: adminContractPublicKey.toBase58(),
      adminAddress: adminAddress.toBase58(),
      tokenSymbol,
    };

    return {
      status: 200,
      json: tokenState,
    };
  } catch (error: any) {
    console.error("getTokenState catch", error);
    return {
      status: 500,
      json: {
        error: error?.message ?? (error ? String(error) : "unknown error"),
      },
    };
  }
}
