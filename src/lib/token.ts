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

import { FungibleTokenTransactionType } from "./api/types";
export type TokenAction = FungibleTokenTransactionType;

export interface MintAddress {
  amount: number | "";
  address: string;
}

export interface MintAddressVerified {
  amount: number;
  address: string;
}
export interface TokenLinks {
  twitter: string;
  discord: string;
  telegram: string;
  instagram: string;
  facebook: string;
  website: string;
}

export interface LaunchTokenData {
  symbol: string;
  name: string;
  description: string;
  links: TokenLinks;
  image: File | undefined;
  imageURL: string | undefined;
  adminAddress: string;
  mintAddresses: MintAddress[];
}

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

export interface TokenDeployParams {
  tokenPrivateKey: string;
  adminContractPrivateKey: string;
  tokenPublicKey: string;
  tokenId: string;
  adminContractPublicKey: string;
}
