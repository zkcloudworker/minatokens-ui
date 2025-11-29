import { ActivityType, Chain } from "@prisma/client";

/**
 * Base activity data structure shared by all activity types
 */
export interface BaseActivityData {
  tokenSymbol?: string;
  tokenName?: string;
  tokenId?: string;
  developerFee?: number;
  fee?: number;
  nonce?: number;
}

/**
 * Activity data for token launch operations
 */
export interface LaunchActivityData extends BaseActivityData {
  adminContractAddress: string;
  decimals?: number;
  uri?: string;
  whitelist?: Array<{
    address: string;
    amount: number;
  }>;
  totalSupply?: number;
}

/**
 * Activity data for token minting operations
 */
export interface MintActivityData extends BaseActivityData {
  recipientAddress: string;
  minterAddress?: string;
}

/**
 * Activity data for token transfer operations
 */
export interface TransferActivityData extends BaseActivityData {
  fromAddress: string;
  toAddress: string;
}

/**
 * Activity data for token burn operations
 */
export interface BurnActivityData extends BaseActivityData {
  burnerAddress: string;
}

/**
 * Activity data for token redeem operations
 */
export interface RedeemActivityData extends BaseActivityData {
  redeemerAddress: string;
}

/**
 * Activity data for offer/bid trading operations
 */
export interface TradeActivityData extends BaseActivityData {
  offerAddress?: string;
  bidAddress?: string;
  sellerAddress?: string;
  buyerAddress?: string;
  slippage?: number;
  executionPrice?: bigint;
  // For update activities
  isUpdate?: boolean;
  previousAmount?: bigint;
  previousPrice?: bigint;
  changeReason?: string;
}

/**
 * Activity data for airdrop operations (batch transfers)
 */
export interface AirdropActivityData extends BaseActivityData {
  recipients: Array<{
    address: string;
    amount: bigint;
    memo?: string;
  }>;
  totalAmount: bigint;
  recipientCount: number;
}

/**
 * Activity data for admin whitelist operations
 */
export interface WhitelistActivityData extends BaseActivityData {
  whitelistedAddress: string;
  allowedAmount?: bigint;
  adminAddress: string;
}

/**
 * Activity data for NFT launch operations
 */
export interface NFTLaunchActivityData extends BaseActivityData {
  collectionAddress: string;
  collectionName?: string;
  collectionSymbol?: string;
  adminContractAddress: string;
  metadataVerificationKeyHash?: string;
}

/**
 * Activity data for NFT minting operations
 */
export interface NFTMintActivityData extends BaseActivityData {
  collectionAddress: string;
  nftId: string;
  recipientAddress: string;
  metadata?: any;
  uri?: string;
}

/**
 * Activity data for NFT transfer operations
 */
export interface NFTTransferActivityData extends BaseActivityData {
  collectionAddress: string;
  nftId: string;
  fromAddress: string;
  toAddress: string;
}

/**
 * Activity data for NFT approval operations
 */
export interface NFTApproveActivityData extends BaseActivityData {
  collectionAddress: string;
  nftId: string;
  approvedAddress: string;
  ownerAddress: string;
}

/**
 * Activity data for NFT buy/sell operations
 */
export interface NFTTradeActivityData extends BaseActivityData {
  collectionAddress: string;
  nftId: string;
  sellerAddress: string;
  buyerAddress: string;
  salePrice: bigint;
}

/**
 * Union type of all possible activity data structures
 */
export type ActivityData =
  | LaunchActivityData
  | MintActivityData
  | TransferActivityData
  | BurnActivityData
  | RedeemActivityData
  | TradeActivityData
  | AirdropActivityData
  | WhitelistActivityData
  | NFTLaunchActivityData
  | NFTMintActivityData
  | NFTTransferActivityData
  | NFTApproveActivityData
  | NFTTradeActivityData;

/**
 * Parameters for recording a new activity
 */
export interface RecordActivityParams {
  userAddress: string;
  txHash: string;
  activityType: ActivityType;
  tokenAddress: string;
  chain: Chain;
  activityData: ActivityData;
  amount?: bigint;
  price?: bigint;
  memo?: string;
  jobId?: string;
}

/**
 * Parameters for confirming an activity
 */
export interface ConfirmActivityParams {
  txHash: string;
  blockHeight?: number;
}

/**
 * Parameters for querying user activities
 */
export interface GetActivitiesByUserParams {
  userAddress: string;
  chain?: Chain;
  startDate?: Date;
  endDate?: Date;
  activityTypes?: ActivityType[];
  limit?: number;
  offset?: number;
}

/**
 * Parameters for querying activities by date range
 */
export interface GetActivitiesByDateRangeParams {
  startDate: Date;
  endDate: Date;
  chain?: Chain;
  activityTypes?: ActivityType[];
  tokenAddress?: string;
  limit?: number;
  offset?: number;
}

/**
 * Parameters for getting activity statistics
 */
export interface GetActivityStatsParams {
  userAddress?: string;
  tokenAddress?: string;
  chain?: Chain;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Activity statistics result
 */
export interface ActivityStats {
  totalActivities: number;
  confirmedActivities: number;
  pendingActivities: number;
  activitiesByType: Record<ActivityType, number>;
  uniqueUsers?: number;
  totalVolume?: bigint;
  averageAmount?: bigint;
}

/**
 * Parameters for exporting activities for airdrop
 */
export interface ExportActivitiesForAirdropParams {
  campaignStartDate: Date;
  campaignEndDate: Date;
  chain?: Chain;
  minActivityCount?: number;
  requiredActivityTypes?: ActivityType[];
  weightings?: Partial<Record<ActivityType, number>>;
}

/**
 * Airdrop export result for a single user
 */
export interface AirdropUserExport {
  userAddress: string;
  activityCount: number;
  activityTypes: ActivityType[];
  activityScore: number;
  totalVolume: bigint;
  firstActivityDate: Date;
  lastActivityDate: Date;
}

/**
 * Complete airdrop export result
 */
export interface AirdropExport {
  users: AirdropUserExport[];
  totalUsers: number;
  campaignStartDate: Date;
  campaignEndDate: Date;
  totalActivities: number;
}
