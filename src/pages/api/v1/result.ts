"use server";
import { apiHandler } from "@/lib/api";
import { jobResult } from "@/lib/api/result";
import { JobId, JobResult } from "@/lib/api/types";

export default apiHandler<JobId, JobResult>({
  name: "result",
  handler: jobResult,
});
