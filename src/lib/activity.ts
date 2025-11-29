"use server";
import { PrismaClient, UserActivity, ActivityType, Chain } from "@prisma/client";
import { getPrismaChainName } from "./chain";
import { log as logtail } from "@logtail/next";
import {
  RecordActivityParams,
  ConfirmActivityParams,
  GetActivitiesByUserParams,
  GetActivitiesByDateRangeParams,
  GetActivityStatsParams,
  ActivityStats,
  ExportActivitiesForAirdropParams,
  AirdropExport,
  AirdropUserExport,
} from "./activity-types";

const prisma = new PrismaClient({
  datasourceUrl: process.env.POSTGRES_PRISMA_URL,
});

const log = logtail.with({
  service: "activity",
});

/**
 * Records a new user activity when a transaction is sent
 * This is called immediately after getting a transaction hash
 */
export async function recordActivity(
  params: RecordActivityParams
): Promise<UserActivity | null> {
  try {
    const {
      userAddress,
      txHash,
      activityType,
      tokenAddress,
      chain,
      activityData,
      amount,
      price,
      memo,
      jobId,
    } = params;

    // For non-pending txHash, check if activity already exists to prevent duplicates
    if (!txHash.startsWith("pending-")) {
      const existing = await prisma.userActivity.findFirst({
        where: {
          txHash,
          activityType,
          userAddress,
          tokenAddress
        },
      });

      if (existing) {
        log.warn("Activity already recorded", { txHash, activityType });
        return existing;
      }
    }

    const activity = await prisma.userActivity.create({
      data: {
        userAddress,
        txHash,
        activityType,
        tokenAddress,
        chain,
        activityData: activityData as any,
        amount,
        price,
        memo,
        jobId,
        txSentAt: new Date(),
        isConfirmed: false,
      },
    });

    log.info("Activity recorded", {
      txHash,
      activityType,
      userAddress,
      tokenAddress,
    });

    return activity;
  } catch (error) {
    log.error("Error recording activity", {
      error,
      params,
    });
    return null;
  }
}

/**
 * Updates activities to mark them as confirmed when the transaction is included in a block
 * This is called after transaction confirmation
 * Handles multiple activities with same txHash (e.g., airdrops)
 * Returns the number of activities confirmed
 */
export async function confirmActivity(
  params: ConfirmActivityParams
): Promise<number> {
  try {
    const { txHash, blockHeight } = params;

    // Update all activities with this txHash
    const result = await prisma.userActivity.updateMany({
      where: {
        txHash,
        isConfirmed: false
      },
      data: {
        isConfirmed: true,
        txConfirmedAt: new Date(),
        blockHeight,
      },
    });

    if (result.count > 0) {
      log.info("Activities confirmed", {
        txHash,
        blockHeight,
        count: result.count,
      });
    } else {
      log.warn("No unconfirmed activities found for txHash", { txHash });
    }

    return result.count;
  } catch (error) {
    log.error("Error confirming activities", {
      error,
      txHash: params.txHash,
    });
    return 0;
  }
}

/**
 * Retrieves activities for a specific user
 * Useful for displaying user activity history
 */
export async function getActivitiesByUser(
  params: GetActivitiesByUserParams
): Promise<UserActivity[]> {
  try {
    const {
      userAddress,
      chain,
      startDate,
      endDate,
      activityTypes,
      limit = 100,
      offset = 0,
    } = params;

    const activities = await prisma.userActivity.findMany({
      where: {
        userAddress,
        ...(chain && { chain }),
        ...(startDate && {
          txSentAt: {
            gte: startDate,
          },
        }),
        ...(endDate && {
          txSentAt: {
            lte: endDate,
          },
        }),
        ...(activityTypes &&
          activityTypes.length > 0 && {
            activityType: {
              in: activityTypes,
            },
          }),
      },
      orderBy: {
        txSentAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    return activities;
  } catch (error) {
    log.error("Error getting user activities", {
      error,
      params,
    });
    return [];
  }
}

/**
 * Retrieves activities within a specific date range
 * Primary function for airdrop campaign analysis
 */
export async function getActivitiesByDateRange(
  params: GetActivitiesByDateRangeParams
): Promise<UserActivity[]> {
  try {
    const {
      startDate,
      endDate,
      chain,
      activityTypes,
      tokenAddress,
      limit = 10000,
      offset = 0,
    } = params;

    const activities = await prisma.userActivity.findMany({
      where: {
        txSentAt: {
          gte: startDate,
          lte: endDate,
        },
        isConfirmed: true, // Only confirmed activities for campaigns
        ...(chain && { chain }),
        ...(tokenAddress && { tokenAddress }),
        ...(activityTypes &&
          activityTypes.length > 0 && {
            activityType: {
              in: activityTypes,
            },
          }),
      },
      orderBy: {
        txSentAt: "asc",
      },
      take: limit,
      skip: offset,
    });

    return activities;
  } catch (error) {
    log.error("Error getting activities by date range", {
      error,
      params,
    });
    return [];
  }
}

/**
 * Gets aggregated statistics for activities
 * Useful for analytics and dashboards
 */
export async function getActivityStats(
  params: GetActivityStatsParams
): Promise<ActivityStats> {
  try {
    const { userAddress, tokenAddress, chain, startDate, endDate } = params;

    const whereClause: any = {
      ...(userAddress && { userAddress }),
      ...(tokenAddress && { tokenAddress }),
      ...(chain && { chain }),
      ...(startDate && {
        txSentAt: {
          gte: startDate,
        },
      }),
      ...(endDate && {
        txSentAt: {
          lte: endDate,
        },
      }),
    };

    // Get total counts
    const totalActivities = await prisma.userActivity.count({
      where: whereClause,
    });

    const confirmedActivities = await prisma.userActivity.count({
      where: {
        ...whereClause,
        isConfirmed: true,
      },
    });

    // Get activities by type
    const activitiesByTypeRaw = await prisma.userActivity.groupBy({
      by: ["activityType"],
      where: whereClause,
      _count: {
        activityType: true,
      },
    });

    const activitiesByType: Record<ActivityType, number> = {} as any;
    activitiesByTypeRaw.forEach((item) => {
      activitiesByType[item.activityType] = item._count.activityType;
    });

    // Get unique users count (only if not filtering by user)
    let uniqueUsers: number | undefined;
    if (!userAddress) {
      const uniqueUsersResult = await prisma.userActivity.findMany({
        where: whereClause,
        distinct: ["userAddress"],
        select: {
          userAddress: true,
        },
      });
      uniqueUsers = uniqueUsersResult.length;
    }

    // Get volume statistics
    const volumeStats = await prisma.userActivity.aggregate({
      where: {
        ...whereClause,
        amount: {
          not: null,
        },
      },
      _sum: {
        amount: true,
      },
      _avg: {
        amount: true,
      },
    });

    return {
      totalActivities,
      confirmedActivities,
      pendingActivities: totalActivities - confirmedActivities,
      activitiesByType,
      uniqueUsers,
      totalVolume: volumeStats._sum.amount ?? BigInt(0),
      averageAmount: volumeStats._avg.amount
        ? BigInt(Math.floor(volumeStats._avg.amount))
        : BigInt(0),
    };
  } catch (error) {
    log.error("Error getting activity stats", {
      error,
      params,
    });
    return {
      totalActivities: 0,
      confirmedActivities: 0,
      pendingActivities: 0,
      activitiesByType: {} as Record<ActivityType, number>,
    };
  }
}

/**
 * Exports activities for airdrop calculation
 * Returns eligible users with their activity scores
 */
export async function exportActivitiesForAirdrop(
  params: ExportActivitiesForAirdropParams
): Promise<AirdropExport> {
  try {
    const {
      campaignStartDate,
      campaignEndDate,
      chain,
      minActivityCount = 1,
      requiredActivityTypes,
      weightings,
    } = params;

    // Default weightings for different activity types
    const defaultWeightings: Partial<Record<ActivityType, number>> = {
      LAUNCH: 1000,
      MINT: 100,
      OFFER_BUY: 50,
      OFFER_CREATE: 20,
      OFFER_UPDATE: 15,
      OFFER_WITHDRAW: 0,
      BID_SELL: 50,
      BID_CREATE: 20,
      BID_UPDATE: 15,
      BID_WITHDRAW: 0,
      TRANSFER: 10,
      AIRDROP: 200,
      BURN: 5,
      REDEEM: 5,
      ADMIN_WHITELIST: 0,
      NFT_LAUNCH: 500,
      NFT_MINT: 50,
      NFT_BUY: 30,
      NFT_SELL: 30,
      NFT_TRANSFER: 10,
      NFT_APPROVE: 5,
    };

    const finalWeightings = { ...defaultWeightings, ...weightings };

    const activities = await prisma.userActivity.findMany({
      where: {
        txConfirmedAt: {
          gte: campaignStartDate,
          lte: campaignEndDate,
        },
        isConfirmed: true,
        ...(chain && { chain }),
        ...(requiredActivityTypes &&
          requiredActivityTypes.length > 0 && {
            activityType: {
              in: requiredActivityTypes,
            },
          }),
      },
      select: {
        userAddress: true,
        activityType: true,
        amount: true,
        price: true,
        txConfirmedAt: true,
      },
    });

    // Group activities by user
    const userActivitiesMap = new Map<
      string,
      {
        activities: typeof activities;
        types: Set<ActivityType>;
        totalVolume: bigint;
      }
    >();

    activities.forEach((activity) => {
      if (!userActivitiesMap.has(activity.userAddress)) {
        userActivitiesMap.set(activity.userAddress, {
          activities: [],
          types: new Set(),
          totalVolume: BigInt(0),
        });
      }

      const userData = userActivitiesMap.get(activity.userAddress)!;
      userData.activities.push(activity);
      userData.types.add(activity.activityType);

      if (activity.amount) {
        userData.totalVolume += activity.amount;
      }
    });

    // Calculate scores and create export data
    const users: AirdropUserExport[] = [];

    userActivitiesMap.forEach((userData, userAddress) => {
      if (userData.activities.length < minActivityCount) {
        return; // Skip users below minimum activity count
      }

      // Calculate activity score based on weightings
      let activityScore = 0;
      userData.activities.forEach((activity) => {
        const weight = finalWeightings[activity.activityType] ?? 1;
        activityScore += weight;
      });

      const dates = userData.activities
        .map((a) => a.txConfirmedAt!)
        .sort((a, b) => a.getTime() - b.getTime());

      users.push({
        userAddress,
        activityCount: userData.activities.length,
        activityTypes: Array.from(userData.types),
        activityScore,
        totalVolume: userData.totalVolume,
        firstActivityDate: dates[0],
        lastActivityDate: dates[dates.length - 1],
      });
    });

    // Sort by activity score descending
    users.sort((a, b) => b.activityScore - a.activityScore);

    log.info("Airdrop export completed", {
      totalUsers: users.length,
      totalActivities: activities.length,
      campaignStartDate,
      campaignEndDate,
    });

    return {
      users,
      totalUsers: users.length,
      campaignStartDate,
      campaignEndDate,
      totalActivities: activities.length,
    };
  } catch (error) {
    log.error("Error exporting activities for airdrop", {
      error,
      params,
    });
    return {
      users: [],
      totalUsers: 0,
      campaignStartDate: params.campaignStartDate,
      campaignEndDate: params.campaignEndDate,
      totalActivities: 0,
    };
  }
}

/**
 * Helper function to get activities by transaction hash
 * Returns all activities with the given txHash (may be multiple for batch transactions)
 */
export async function getActivitiesByTxHash(
  txHash: string
): Promise<UserActivity[]> {
  try {
    return await prisma.userActivity.findMany({
      where: { txHash },
      orderBy: { createdAt: "asc" },
    });
  } catch (error) {
    log.error("Error getting activities by tx hash", {
      error,
      txHash,
    });
    return [];
  }
}

/**
 * Helper function to get activity by job ID
 */
export async function getActivityByJobId(
  jobId: string
): Promise<UserActivity | null> {
  try {
    return await prisma.userActivity.findFirst({
      where: { jobId },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    log.error("Error getting activity by job ID", {
      error,
      jobId,
    });
    return null;
  }
}

/**
 * Updates the transaction hash for activities (when moving from jobId to txHash)
 * Handles multiple activities per jobId (e.g., airdrops)
 * Returns the number of activities updated
 */
export async function updateActivityTxHash(
  jobId: string,
  txHash: string
): Promise<number> {
  try {
    // Find all activities with this jobId that have pending txHash
    const activities = await prisma.userActivity.findMany({
      where: {
        jobId,
        txHash: {
          startsWith: "pending-"
        }
      },
    });

    if (activities.length === 0) {
      log.warn("No pending activities found for jobId", { jobId });
      return 0;
    }

    // Update all activities with the real txHash
    const result = await prisma.userActivity.updateMany({
      where: {
        jobId,
        txHash: {
          startsWith: "pending-"
        }
      },
      data: { txHash },
    });

    log.info("Activity txHash(es) updated", {
      jobId,
      txHash,
      count: result.count,
    });

    return result.count;
  } catch (error) {
    log.error("Error updating activity txHash", {
      error,
      jobId,
      txHash,
    });
    return 0;
  }
}

/**
 * Helper function to get unconfirmed activities older than a certain time
 * Useful for finding stuck transactions
 */
export async function getUnconfirmedActivities(params: {
  olderThan: Date;
  chain?: Chain;
  limit?: number;
}): Promise<UserActivity[]> {
  try {
    const { olderThan, chain, limit = 100 } = params;

    return await prisma.userActivity.findMany({
      where: {
        isConfirmed: false,
        txSentAt: {
          lt: olderThan,
        },
        ...(chain && { chain }),
      },
      orderBy: {
        txSentAt: "asc",
      },
      take: limit,
    });
  } catch (error) {
    log.error("Error getting unconfirmed activities", {
      error,
      params,
    });
    return [];
  }
}
