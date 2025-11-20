"use server";
import { apiHandler } from "@/lib/api/api";
import { UserActivity, PrismaClient } from "@prisma/client";
import { ApiResponse } from "@/lib/api/api-types";
import { log as logtail } from "@logtail/next";

const log = logtail.with({
  service: "activity:query",
});

const prisma = new PrismaClient({
  datasourceUrl: process.env.POSTGRES_PRISMA_URL,
});

interface ActivityQueryParams {
  start?: number; // Unix timestamp in seconds
  end?: number; // Unix timestamp in seconds
}

async function getActivities(props: {
  params: ActivityQueryParams;
  name: string;
  apiKeyAddress: string;
}): Promise<ApiResponse<UserActivity[]>> {
  try {
    const { start, end } = props.params;

    const whereClause: any = {};

    if (start && end) {
      // Both start and end provided
      whereClause.txSentAt = {
        gte: new Date(start * 1000),
        lte: new Date(end * 1000),
      };
    } else if (start) {
      // Only start provided
      whereClause.txSentAt = {
        gte: new Date(start * 1000),
      };
    } else if (end) {
      // Only end provided
      whereClause.txSentAt = {
        lte: new Date(end * 1000),
      };
    }
    // If neither start nor end, return ALL activities

    const activities = await prisma.userActivity.findMany({
      where: whereClause,
      orderBy: {
        txSentAt: "desc",
      },
    });

    log.info("Activities fetched", {
      count: activities.length,
      start,
      end,
    });

    // Convert BigInt fields to strings for JSON serialization
    const serializedActivities = activities.map((activity) => ({
      ...activity,
      amount: activity.amount?.toString() ?? null,
      price: activity.price?.toString() ?? null,
      activityData: JSON.parse(
        JSON.stringify(activity.activityData, (key, value) =>
          typeof value === "bigint" ? value.toString() : value
        )
      ),
    }));

    return {
      status: 200,
      json: serializedActivities as any,
    };
  } catch (error) {
    log.error("Failed to fetch activities", { error });
    return {
      status: 500,
      json: { error: "Failed to fetch activities" } as any,
    };
  }
}

export default apiHandler<ActivityQueryParams, UserActivity[]>({
  name: "activity:query" as any,
  handler: getActivities,
});
