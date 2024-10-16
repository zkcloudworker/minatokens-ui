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
  totalSupply: number;
  isPaused: boolean;
  decimals: number;
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
