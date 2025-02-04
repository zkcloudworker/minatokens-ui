/*
    const json = {
      symbol: tokenSymbol,
      name: tokenName,
      description: tokenDescription,
      image: "", // TODO: imageUrl
      website,
      telegram,
      twitter,
      discord,
      tokenContractCode:
        "https://github.com/MinaFoundation/mina-fungible-token/blob/main/FungibleToken.ts",
      adminContractsCode: [
        "https://github.com/MinaFoundation/mina-fungible-token/blob/main/FungibleTokenAdmin.ts",
      ],
    };
*/

import {
  TokenTransactionType,
  LaunchTokenStandardAdminParams,
  LaunchTokenAdvancedAdminParams,
  TokenTransactionParams,
} from "@minatokens/api";
//export type TokenAction = Exclude<FungibleTokenTransactionType, "launch">;
export type TokenAction =
  | "mint"
  | "redeem"
  | "transfer"
  | "airdrop"
  | "burn"
  | "orderbook"
  | "offer"
  | "bid"
  | "withdraw"
  | "pause"
  | "resume";

export interface MintAddress {
  amount: number | "" | undefined;
  address: string;
}

export interface MintAddressVerified {
  amount: number;
  address: string;
}
export interface TokenLinks {
  twitter?: string;
  discord?: string;
  telegram?: string;
  instagram?: string;
  facebook?: string;
  website?: string;
}

export interface LaunchTokenData {
  symbol: string;
  name?: string;
  description?: string;
  tokenType: "standard" | "meme";
  links: TokenLinks;
  image?: File;
  imageURL?: string;
  adminAddress: string;
  mintAddresses: MintAddress[];
}

export type TokenActionTransactionParams = Exclude<
  TokenTransactionParams,
  LaunchTokenStandardAdminParams | LaunchTokenAdvancedAdminParams
>;

export interface TokenActionData {
  symbol: string;
  txs: TokenActionTransactionParams[];
}

export interface TokenInfo {
  symbol: string;
  name?: string;
  description?: string;
  image?: string;
  twitter?: string;
  discord?: string;
  telegram?: string;
  instagram?: string;
  facebook?: string;
  website?: string;
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
  adminType: "standard" | "advanced" | "bondingCurve" | "unknown";
  mintPrice?: number;
  redeemPrice?: number;
}

export interface DeployedTokenInfo extends TokenInfo, TokenState {
  created: number;
  updated: number;
  chain: string;
  likes?: number;
  rating?: number;
  status?: string;
}

export interface TokenDeployParams {
  tokenPrivateKey: string;
  adminContractPrivateKey: string;
  tokenPublicKey: string;
  tokenId: string;
  adminContractPublicKey: string;
}
