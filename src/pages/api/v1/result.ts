"use server";
import { apiHandler } from "@/lib/api";
import { jobResult } from "@/lib/api/result";
import { JobId, JobResult } from "@minatokens/api";

export default apiHandler<JobId, JobResult>({
  name: "result",
  handler: jobResult,
});
