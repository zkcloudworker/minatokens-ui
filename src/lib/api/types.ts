export interface DeployTransaction {
  serializedTransaction: string;
  transaction: string;
  tokenContractPrivateKey: string;
  adminContractPrivateKey: string;
  tokenAddress: string;
  adminContractAddress: string;
  payload: {
    nonce: number;
    transaction: string;
    onlySign: boolean;
    feePayer: {
      fee: number;
      memo: string;
    };
  };
  uri: string;
}

export interface DeployTokenParams {
  adminAddress: string;
  symbol: string;
  decimals: number;
  uri: string;
}

export interface TokenTransaction {
  serializedTransaction: string;
  transaction: string;
  tokenAddress: string;
  adminContractAddress: string;
  payload: {
    nonce: number;
    transaction: string;
    onlySign: boolean;
    feePayer: {
      fee: number;
      memo: string;
    };
  };
}

export interface TransactionTokenParams {
  txType: "transfer" | "mint";
  symbol: string;
  senderAddress: string;
  tokenAddress: string;
  adminContractAddress: string;
  to: string;
  amount: number;
}

export interface ProveTokenTransaction {
  txType: "deploy" | "transfer" | "mint";
  serializedTransaction: string;
  signedData: string;
  senderAddress: string;
  tokenAddress: string;
  adminContractAddress: string;
  symbol: string;
  uri?: string;
  to?: string;
  amount?: number;
  sendTransaction: boolean;
}

export interface JobId {
  jobId: string;
}

export interface TransactionResult {
  hash?: string;
  tx?: string;
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

export type ApiResponse<T> =
  | {
      /** Bad request - invalid input parameters */
      status: 400;
      json: { error: string };
    }
  | {
      /** Unauthorized - user not authenticated */
      status: 401;
      json: { error: string };
    }
  | {
      /** Forbidden - user doesn't have permission */
      status: 403;
      json: { error: string };
    }
  | {
      /** Internal server error - something went wrong during deployment */
      status: 500;
      json: { error: string };
    }
  | {
      /** Service unavailable - blockchain or other external service is down */
      status: 503;
      json: { error: string };
    }
  | {
      /** Success - API response */
      status: 200;
      json: T;
    };
