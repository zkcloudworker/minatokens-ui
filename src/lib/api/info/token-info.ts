"use server";
import { Mina, PublicKey, Bool, TokenId, Struct, UInt8 } from "o1js";
import { initBlockchain, fetchMinaAccount } from "@/lib/blockchain";
import {
  TokenState,
  TokenInfoRequestParams,
  BalanceRequestParams,
  BalanceResponse,
} from "@minatokens/api";
import { ApiName, ApiResponse } from "../api-types";
import {
  FungibleTokenOfferContract,
  FungibleTokenBidContract,
} from "@minatokens/token";
import { checkAddress } from "../utils/address";
import {
  updateTokenInfo,
  getTokenState as getTokenStateInternal,
} from "@/tokens/lib/state";
import {
  OfferInfo,
  writeOffer,
  getOffer,
  BidInfo,
  writeBid,
  getBid,
} from "../../trade";
import { debug } from "@/lib/debug";
const DEBUG = debug();

export async function formatBalance(num: number): Promise<string> {
  const fixed = num.toFixed(2);
  return fixed.endsWith(".00") ? fixed.slice(0, -3) : fixed;
}

function formatBalanceInternal(num: number): string {
  const fixed = num.toFixed(2);
  return fixed.endsWith(".00") ? fixed.slice(0, -3) : fixed;
}

export async function balance(props: {
  params: BalanceRequestParams;
  name: ApiName;
  apiKeyAddress: string;
}): Promise<ApiResponse<BalanceResponse>> {
  const { params, name, apiKeyAddress } = props;
  const { tokenAddress, address } = params;

  try {
    await initBlockchain();

    if (!address || !checkAddress(address)) {
      return {
        status: 400,
        json: { error: "Invalid address" },
      };
    }

    if (tokenAddress && !checkAddress(tokenAddress)) {
      return {
        status: 400,
        json: { error: "Invalid token address" },
      };
    }

    const tokenContractPublicKey = tokenAddress
      ? PublicKey.fromBase58(tokenAddress)
      : undefined;
    const publicKey = PublicKey.fromBase58(address);
    const tokenIdDerived = tokenContractPublicKey
      ? TokenId.derive(tokenContractPublicKey)
      : undefined;

    if (
      tokenIdDerived &&
      params.tokenId &&
      TokenId.toBase58(tokenIdDerived) !== params.tokenId
    ) {
      return {
        status: 400,
        json: { error: "TokenId does not match tokenAddress" },
      };
    }
    const tokenId =
      tokenIdDerived ??
      (params.tokenId ? TokenId.fromBase58(params.tokenId) : undefined);

    try {
      await fetchMinaAccount({
        publicKey,
        tokenId,
        force: false,
      });
      return {
        status: 200,
        json: {
          tokenAddress,
          address,
          tokenId: tokenId ? TokenId.toBase58(tokenId) : undefined,
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
          tokenId: tokenId ? TokenId.toBase58(tokenId) : undefined,
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

export interface AccountBalance {
  name?: string;
  address: string;
  balance?: number;
  balanceDiff?: number;
  tokenBalance?: number;
  tokenBalanceDiff?: number;
  balanceString?: string;
  tokenBalanceString?: string;
}

export async function getBalances({
  accounts,
  tokenId,
  tokenAddress,
}: {
  accounts: AccountBalance[];
  tokenId?: string;
  tokenAddress: string;
}) {
  for (const account of accounts) {
    const b = await balance({
      params: { address: account.address },
      name: "info:balance",
      apiKeyAddress: "",
    });
    const tb = await balance({
      params: { address: account.address, tokenAddress, tokenId },
      name: "info:balance",
      apiKeyAddress: "",
    });
    if (
      (b.status === 200 && account.balance !== b.json.balance) ||
      (tb.status === 200 && account.tokenBalance !== tb.json.balance)
    ) {
      const newB = b.status === 200 ? b.json.balance ?? undefined : undefined;
      const newTB =
        tb.status === 200 ? tb.json.balance ?? undefined : undefined;
      account.balanceDiff =
        account.balance && newB ? newB - account.balance : newB;
      account.tokenBalanceDiff =
        tb !== undefined
          ? account.tokenBalance && newTB
            ? newTB - account.tokenBalance
            : newTB
          : 0;
      account.balanceString = newB
        ? `Balance of ${account.address}: ${formatBalanceInternal(
            newB / 1_000_000_000
          )} MINA ${
            account.balanceDiff
              ? "(" +
                (account.balanceDiff >= 0 ? "+" : "") +
                formatBalanceInternal(account.balanceDiff / 1_000_000_000) +
                ")"
              : ""
          }`
        : undefined;

      account.tokenBalanceString = `Balance of ${account.address}: ${
        newTB ? formatBalanceInternal(newTB / 1_000_000_000) : 0
      } TEST ${
        account.tokenBalanceDiff
          ? "(" +
            (account.tokenBalanceDiff >= 0 ? "+" : "") +
            formatBalanceInternal(account.tokenBalanceDiff / 1_000_000_000) +
            ")"
          : ""
      }`;
      account.balance = newB;
      account.tokenBalance = newTB;
    }
  }
  console.log("getBalances accounts", accounts);
  return accounts;
}

export interface OfferInfoRequest {
  tokenAddress: string;
  offerAddress: string;
}

export interface BidInfoRequest {
  tokenAddress: string;
  bidAddress: string;
}

export async function offerInfo(
  params: OfferInfoRequest,
  apiKeyAddress: string
): Promise<ApiResponse<OfferInfo>> {
  const { tokenAddress, offerAddress } = params;

  try {
    await initBlockchain();

    if (!offerAddress || !checkAddress(offerAddress)) {
      return {
        status: 400,
        json: { error: "Invalid offer address" },
      };
    }

    if (!tokenAddress || !checkAddress(tokenAddress)) {
      return {
        status: 400,
        json: { error: "Invalid token address" },
      };
    }

    const tokenContractPublicKey = PublicKey.fromBase58(tokenAddress);
    const offerPublicKey = PublicKey.fromBase58(offerAddress);
    const tokenId = TokenId.derive(tokenContractPublicKey);

    await fetchMinaAccount({
      publicKey: offerPublicKey,
      tokenId,
      force: false,
    });
    if (!Mina.hasAccount(offerPublicKey, tokenId)) {
      writeOffer({
        tokenAddress,
        offerAddress,
        amount: 0,
        price: 0,
        ownerAddress: "",
      });
      return {
        status: 400,
        json: { error: "Offer account not found" },
      };
    }
    const offer = new FungibleTokenOfferContract(offerPublicKey, tokenId);
    const price = Number(offer.price.get().toBigInt());
    const amount = Number(
      Mina.getAccount(offerPublicKey, tokenId).balance.toBigInt()
    );
    const ownerAddress = offer.seller.get().toBase58();
    const offerInfo = await getOffer({ tokenAddress, offerAddress });
    if (
      offerInfo === null ||
      amount !== Number(offerInfo?.amount) ||
      price !== Number(offerInfo?.price) ||
      ownerAddress !== offerInfo?.ownerAddress
    ) {
      writeOffer({
        tokenAddress,
        offerAddress,
        amount,
        price,
        ownerAddress,
      });
    }

    return {
      status: 200,
      json: {
        tokenAddress,
        offerAddress,
        ownerAddress,
        amount,
        price,
      },
    };
  } catch (error) {
    console.error("Cannot fetch offer info", params, error);
    return {
      status: 500,
      json: { error: "Failed to get offer info" },
    };
  }
}

export async function bidInfo(
  params: BidInfoRequest,
  apiKeyAddress: string
): Promise<ApiResponse<BidInfo>> {
  const { tokenAddress, bidAddress } = params;

  try {
    await initBlockchain();

    if (!bidAddress || !checkAddress(bidAddress)) {
      return {
        status: 400,
        json: { error: "Invalid bid address" },
      };
    }

    if (!tokenAddress || !checkAddress(tokenAddress)) {
      return {
        status: 400,
        json: { error: "Invalid token address" },
      };
    }

    const tokenContractPublicKey = PublicKey.fromBase58(tokenAddress);
    const bidPublicKey = PublicKey.fromBase58(bidAddress);
    const tokenId = TokenId.derive(tokenContractPublicKey);

    await fetchMinaAccount({
      publicKey: bidPublicKey,
      force: false,
    });
    if (!Mina.hasAccount(bidPublicKey)) {
      writeBid({
        tokenAddress,
        bidAddress,
        amount: 0,
        price: 0,
        ownerAddress: "",
      });
      return {
        status: 400,
        json: { error: "Bid account not found" },
      };
    }
    const bid = new FungibleTokenBidContract(bidPublicKey);
    const price = Number(bid.price.get().toBigInt());
    const amount = Number(Mina.getAccount(bidPublicKey).balance.toBigInt());
    const ownerAddress = bid.buyer.get().toBase58();
    const bidInfo = await getBid({ tokenAddress, bidAddress });
    if (
      bidInfo === null ||
      amount !== Number(bidInfo?.amount) ||
      price !== Number(bidInfo?.price) ||
      ownerAddress !== bidInfo?.ownerAddress
    ) {
      writeBid({
        tokenAddress,
        bidAddress,
        amount,
        price,
        ownerAddress,
      });
    }

    return {
      status: 200,
      json: {
        tokenAddress,
        bidAddress,
        ownerAddress,
        amount,
        price,
      },
    };
  } catch (error) {
    console.error("Cannot fetch bid info", params, error);
    return {
      status: 500,
      json: { error: "Failed to get bid info" },
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

export async function getTokenState(props: {
  params: TokenInfoRequestParams;
  name: ApiName;
  apiKeyAddress: string;
}): Promise<ApiResponse<TokenState>> {
  const { params, name, apiKeyAddress } = props;
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
    const result = await getTokenStateInternal({
      tokenAddress,
    });

    // await fetchMinaAccount({ publicKey: tokenContractPublicKey, force: false });
    // if (!Mina.hasAccount(tokenContractPublicKey)) {
    //   return {
    //     status: 400,
    //     json: { error: "Token contract account not found" },
    //   };
    // }
    // const tokenId = TokenId.derive(tokenContractPublicKey);
    // await fetchMinaAccount({
    //   publicKey: tokenContractPublicKey,
    //   tokenId,
    //   force: false,
    // });
    // if (!Mina.hasAccount(tokenContractPublicKey, tokenId)) {
    //   console.error(
    //     "getTokenState: Token contract totalSupply account not found",
    //     {
    //       tokenAddress,
    //     }
    //   );
    //   return {
    //     status: 400,
    //     json: { error: "Token contract totalSupply account not found" },
    //   };
    // }
    // const account = Mina.getAccount(tokenContractPublicKey);
    // if (account.zkapp?.appState === undefined) {
    //   console.error("getTokenState: Token contract state not found", {
    //     tokenAddress,
    //   });
    //   return {
    //     status: 400,
    //     json: { error: "Token contract state not found" },
    //   };
    // }
    // const state = FungibleTokenState.fromFields(
    //   account.zkapp?.appState.slice(0, FungibleTokenStateSize)
    // );
    // const adminContractPublicKey = state.admin;
    // const decimals = state.decimals.toNumber();
    // const isPaused = state.paused.toBoolean();
    // const totalSupply =
    //   Number(Mina.getBalance(tokenContractPublicKey, tokenId).toBigInt()) /
    //   1_000_000_000;
    // const tokenSymbol = account.tokenSymbol;
    // const uri = account.zkapp?.zkappUri;

    // if (uri === undefined) {
    //   console.error("getTokenState: Token uri not found", {
    //     tokenAddress,
    //   });
    //   return {
    //     status: 400,
    //     json: { error: "Token uri not found" },
    //   };
    // }
    // const verificationKeyHash = account.zkapp?.verificationKey?.hash.toJSON();
    // if (verificationKeyHash === undefined) {
    //   console.error("getTokenState: Token verification key hash not found", {
    //     tokenAddress,
    //   });
    //   return {
    //     status: 400,
    //     json: { error: "Token verification key hash not found" },
    //   };
    // }
    // const versionData = account.zkapp?.zkappVersion;
    // if (versionData === undefined) {
    //   console.error("getTokenState: Token contract version not found", {
    //     tokenAddress,
    //   });
    //   return {
    //     status: 400,
    //     json: { error: "Token contract version not found" },
    //   };
    // }
    // const version = Number(versionData.toBigint());

    // await fetchMinaAccount({ publicKey: adminContractPublicKey, force: false });
    // if (!Mina.hasAccount(adminContractPublicKey)) {
    //   console.error("getTokenState: Admin contract account not found", {
    //     tokenAddress,
    //   });
    //   return {
    //     status: 400,
    //     json: { error: "Admin contract account not found" },
    //   };
    // }

    // const adminContract = Mina.getAccount(adminContractPublicKey);
    // const adminTokenSymbol = adminContract.tokenSymbol;
    // const adminUri = adminContract.zkapp?.zkappUri;

    // const adminVerificationKeyHash =
    //   adminContract.zkapp?.verificationKey?.hash.toJSON();
    // if (adminVerificationKeyHash === undefined) {
    //   console.error(
    //     "getTokenState: Admin contract verification key hash not found",
    //     {
    //       adminContractPublicKey: adminContractPublicKey.toBase58(),
    //     }
    //   );
    //   return {
    //     status: 400,
    //     json: { error: "Admin contract verification key hash not found" },
    //   };
    // }
    // const adminVersionData = adminContract.zkapp?.zkappVersion;
    // if (adminVersionData === undefined) {
    //   console.error("getTokenState: Admin contract version not found", {
    //     adminContractPublicKey: adminContractPublicKey.toBase58(),
    //   });
    //   return {
    //     status: 400,
    //     json: { error: "Admin contract version not found" },
    //   };
    // }
    // const adminVersion = Number(adminVersionData.toBigint());
    // const adminAddress0 = adminContract.zkapp?.appState[0];
    // const adminAddress1 = adminContract.zkapp?.appState[1];
    // if (adminAddress0 === undefined || adminAddress1 === undefined) {
    //   console.error("Cannot fetch admin address from admin contract");
    //   return {
    //     status: 400,
    //     json: { error: "Cannot fetch admin address from admin contract" },
    //   };
    // }
    // const adminAddress = PublicKey.fromFields([adminAddress0, adminAddress1]);
    // let adminTokenBalance = 0;
    // try {
    //   await fetchMinaAccount({
    //     publicKey: adminAddress,
    //     tokenId,
    //     force: false,
    //   });
    //   adminTokenBalance = Number(
    //     Mina.getBalance(adminAddress, tokenId).toBigInt()
    //   );
    // } catch (error) {}

    // const tokenState: TokenState = {
    //   tokenAddress: tokenContractPublicKey.toBase58(),
    //   tokenId: TokenId.toBase58(tokenId),
    //   adminContractAddress: adminContractPublicKey.toBase58(),
    //   adminAddress: adminAddress.toBase58(),
    //   adminTokenBalance,
    //   totalSupply,
    //   isPaused,
    //   decimals,
    //   tokenSymbol,
    //   verificationKeyHash,
    //   uri,
    //   version,
    //   adminTokenSymbol,
    //   adminUri: adminUri ?? "",
    //   adminVerificationKeyHash,
    //   adminVersion,
    // };

    // const updated = await updateTokenInfo({
    //   tokenAddress,
    //   tokenState,
    // });
    // if (updated) {
    //   console.log("getTokenState: Updated token info", {
    //     tokenAddress,
    //     symbol: tokenState.tokenSymbol,
    //   });
    // }
    if (result.success) {
      return {
        status: 200,
        json: result.tokenState,
      };
    } else {
      return {
        status: 400,
        json: { error: result.error },
      };
    }
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
