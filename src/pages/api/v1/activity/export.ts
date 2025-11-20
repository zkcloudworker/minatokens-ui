"use server";
import { apiHandler } from "@/lib/api/api";
import { exportActivitiesForAirdrop } from "@/lib/activity";
import { ExportActivitiesForAirdropParams } from "@/lib/activity-types";
import { ApiResponse } from "@/lib/api/api-types";
import { ActivityType, Chain } from "@prisma/client";
import { log as logtail } from "@logtail/next";

const log = logtail.with({
  service: "activity:export",
});

interface ExportRequestParams {
  campaignStart: number; // Unix timestamp in seconds
  campaignEnd: number; // Unix timestamp in seconds
  chain?: Chain;
  minActivityCount?: number;
  requiredActivityTypes?: ActivityType[];
  weightings?: Partial<Record<ActivityType, number>>;
  format?: "json" | "csv";
}

interface AirdropUserExportResponse {
  userAddress: string;
  activityCount: number;
  activityTypes: ActivityType[];
  activityScore: number;
  totalVolume: string;
  firstActivityDate: string;
  lastActivityDate: string;
}

interface AirdropExportResponse {
  users: AirdropUserExportResponse[];
  totalUsers: number;
  campaignStartDate: string;
  campaignEndDate: string;
  totalActivities: number;
}

async function exportForAirdrop(props: {
  params: ExportRequestParams;
  name: string;
  apiKeyAddress: string;
}): Promise<ApiResponse<AirdropExportResponse | string>> {
  try {
    const {
      campaignStart,
      campaignEnd,
      chain,
      minActivityCount,
      requiredActivityTypes,
      weightings,
      format = "json",
    } = props.params;

    if (!campaignStart || !campaignEnd) {
      return {
        status: 400,
        json: { error: "campaignStart and campaignEnd are required" } as any,
      };
    }

    const params: ExportActivitiesForAirdropParams = {
      campaignStartDate: new Date(campaignStart * 1000),
      campaignEndDate: new Date(campaignEnd * 1000),
      chain,
      minActivityCount,
      requiredActivityTypes,
      weightings,
    };

    const result = await exportActivitiesForAirdrop(params);

    log.info("Activities exported for airdrop", {
      totalUsers: result.totalUsers,
      totalActivities: result.totalActivities,
      format,
    });

    if (format === "csv") {
      // Convert to CSV
      const csvHeaders =
        "userAddress,activityCount,activityScore,totalVolume,firstActivityDate,lastActivityDate,activityTypes";
      const csvRows = result.users.map(
        (u) =>
          `${u.userAddress},${u.activityCount},${u.activityScore},${u.totalVolume.toString()},${u.firstActivityDate.toISOString()},${u.lastActivityDate.toISOString()},"${u.activityTypes.join("|")}"`
      );
      const csv = [csvHeaders, ...csvRows].join("\n");

      return {
        status: 200,
        json: csv as any,
      };
    }

    // Return JSON with BigInt and Date conversion
    const response: AirdropExportResponse = {
      users: result.users.map((u) => ({
        userAddress: u.userAddress,
        activityCount: u.activityCount,
        activityTypes: u.activityTypes,
        activityScore: u.activityScore,
        totalVolume: u.totalVolume.toString(),
        firstActivityDate: u.firstActivityDate.toISOString(),
        lastActivityDate: u.lastActivityDate.toISOString(),
      })),
      totalUsers: result.totalUsers,
      campaignStartDate: result.campaignStartDate.toISOString(),
      campaignEndDate: result.campaignEndDate.toISOString(),
      totalActivities: result.totalActivities,
    };

    return {
      status: 200,
      json: response,
    };
  } catch (error) {
    log.error("Failed to export activities", { error });
    return {
      status: 500,
      json: { error: "Failed to export activities" } as any,
    };
  }
}

export default apiHandler<ExportRequestParams, AirdropExportResponse | string>({
  name: "activity:export" as any,
  handler: exportForAirdrop,
});
