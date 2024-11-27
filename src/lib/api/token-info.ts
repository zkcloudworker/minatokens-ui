"use server";
import { Mina, PublicKey, Bool, TokenId, Struct, UInt8 } from "o1js";
import { initBlockchain, fetchMinaAccount } from "@/lib/blockchain";
import {
  ApiResponse,
  TokenState,
  TokenStateRequestParams,
  BalanceRequestParams,
  BalanceResponse,
} from "./types";
import { checkAddress } from "./address";

export async function balance(
  params: BalanceRequestParams,
  apiKeyAddress: string
): Promise<ApiResponse<BalanceResponse>> {
  const { tokenAddress, address } = params;

  try {
    await initBlockchain();

    if (!address || !checkAddress(address)) {
      return {
        status: 400,
        json: { error: "Invalid address" },
      };
    }

    if (!tokenAddress || !checkAddress(tokenAddress)) {
      return {
        status: 400,
        json: { error: "Invalid token address" },
      };
    }

    const tokenContractPublicKey = PublicKey.fromBase58(tokenAddress);
    const publicKey = PublicKey.fromBase58(address);
    const tokenId = TokenId.derive(tokenContractPublicKey);

    try {
      await fetchMinaAccount({ publicKey, tokenId, force: false });
      return {
        status: 200,
        json: {
          tokenAddress,
          address,
          balance: Mina.hasAccount(publicKey, tokenId)
            ? Number(Mina.getAccount(publicKey, tokenId).balance.toBigInt())
            : null,
        },
      };
    } catch (error) {
      console.error("Cannot fetch account balance", params, error);
      return {
        status: 200,
        json: {
          tokenAddress,
          address,
          balance: null,
        },
      };
    }
  } catch (error) {
    console.error("balance catch", params, error);
    return {
      status: 500,
      json: { error: "Failed to get balance" },
    };
  }
}

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

export async function getTokenStateForApi(
  params: TokenStateRequestParams,
  apiKeyAddress: string
): Promise<ApiResponse<TokenState>> {
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
    const tokenId = TokenId.derive(tokenContractPublicKey);
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
        status: 400,
        json: { error: "Token contract totalSupply account not found" },
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
    const adminContractPublicKey = state.admin;
    const decimals = state.decimals.toNumber();
    const isPaused = state.paused.toBoolean();
    const totalSupply =
      Number(Mina.getBalance(tokenContractPublicKey, tokenId).toBigInt()) /
      1_000_000_000;
    const tokenSymbol = account.tokenSymbol;
    const uri = account.zkapp?.zkappUri;

    if (uri === undefined) {
      console.error("getTokenState: Token uri not found", {
        tokenAddress,
      });
      return {
        status: 400,
        json: { error: "Token uri not found" },
      };
    }
    const verificationKeyHash = account.zkapp?.verificationKey?.hash.toJSON();
    if (verificationKeyHash === undefined) {
      console.error("getTokenState: Token verification key hash not found", {
        tokenAddress,
      });
      return {
        status: 400,
        json: { error: "Token verification key hash not found" },
      };
    }
    const versionData = account.zkapp?.zkappVersion;
    if (versionData === undefined) {
      console.error("getTokenState: Token contract version not found", {
        tokenAddress,
      });
      return {
        status: 400,
        json: { error: "Token contract version not found" },
      };
    }
    const version = Number(versionData.toBigint());

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
        status: 400,
        json: { error: "Admin contract verification key hash not found" },
      };
    }
    const adminVersionData = adminContract.zkapp?.zkappVersion;
    if (adminVersionData === undefined) {
      console.error("getTokenState: Admin contract version not found", {
        adminContractPublicKey: adminContractPublicKey.toBase58(),
      });
      return {
        status: 400,
        json: { error: "Admin contract version not found" },
      };
    }
    const adminVersion = Number(adminVersionData.toBigint());
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
    } catch (error) {}

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

    return {
      status: 200,
      json: tokenState,
    };
  } catch (error: any) {
    console.error("getTokenState catch", error);
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
