"use server";

import { getResult } from "@/lib/api/aws-result";
import { JobId, JobResult, ApiResponse } from "./types";

export async function jobResult(
  params: JobId,
  apiKeyAddress: string
): Promise<ApiResponse<JobResult>> {
  const { jobId } = params;

  if (
    !jobId ||
    typeof jobId !== "string" ||
    jobId.startsWith("zkCW") === false
  ) {
    return {
      status: 400,
      json: { error: "Invalid jobId" },
    };
  }

  const result = await getResult(jobId);
  if (!result) {
    return {
      status: 500,
      json: { error: "Failed to get job result" },
    };
  }
  if (!result.success) {
    console.error("Failed job result", { jobId, result });
  }
  return {
    status: 200,
    json: result,
  };
}
