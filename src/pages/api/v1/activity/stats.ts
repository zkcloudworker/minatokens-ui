"use server";
import { apiHandler } from "@/lib/api/api";
import { getActivityStats } from "@/lib/activity";
import { GetActivityStatsParams, ActivityStats } from "@/lib/activity-types";
import { ApiResponse } from "@/lib/api/api-types";
import { Chain } from "@prisma/client";
import { convertToPrismaChain } from "@/lib/chain";
import { log as logtail } from "@logtail/next";

const log = logtail.with({
  service: "activity:stats",
});

interface StatsQueryParams {
  userAddress?: string;
  tokenAddress?: string;
  chain?: string;
  start?: number; // Unix timestamp in seconds
  end?: number; // Unix timestamp in seconds
}

interface ActivityStatsResponse {
  totalActivities: number;
  confirmedActivities: number;
  pendingActivities: number;
  activitiesByType: Record<string, number>;
  uniqueUsers?: number;
  totalVolume?: string;
  averageAmount?: string;
}

async function getStats(props: {
  params: StatsQueryParams;
  name: string;
  apiKeyAddress: string;
}): Promise<ApiResponse<ActivityStatsResponse>> {
  try {
    const { userAddress, tokenAddress, chain, start, end } = props.params;

    const params: GetActivityStatsParams = {
      userAddress,
      tokenAddress,
      chain: convertToPrismaChain(chain) as Chain | undefined,
      startDate: start ? new Date(start * 1000) : undefined,
      endDate: end ? new Date(end * 1000) : undefined,
    };

    const stats = await getActivityStats(params);

    log.info("Activity stats fetched", {
      totalActivities: stats.totalActivities,
      confirmedActivities: stats.confirmedActivities,
      userAddress,
      tokenAddress,
    });

    // Convert bigints to strings for JSON serialization
    const response: ActivityStatsResponse = {
      totalActivities: stats.totalActivities,
      confirmedActivities: stats.confirmedActivities,
      pendingActivities: stats.pendingActivities,
      activitiesByType: stats.activitiesByType as any,
      uniqueUsers: stats.uniqueUsers,
      totalVolume: stats.totalVolume?.toString(),
      averageAmount: stats.averageAmount?.toString(),
    };

    return {
      status: 200,
      json: response,
    };
  } catch (error) {
    log.error("Failed to fetch activity stats", { error });
    return {
      status: 500,
      json: { error: "Failed to fetch activity stats" } as any,
    };
  }
}

export default apiHandler<StatsQueryParams, ActivityStatsResponse>({
  name: "activity:stats" as any,
  handler: getStats,
});
