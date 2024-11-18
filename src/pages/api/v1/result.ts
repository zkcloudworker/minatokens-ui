"use server";
import { apiHandler } from "@/lib/api";
import { jobResult } from "@/lib/api/result";
import { JobId, TransactionResult } from "@/lib/api/types";

export default apiHandler<JobId, TransactionResult>({
  name: "result",
  handler: jobResult,
});
