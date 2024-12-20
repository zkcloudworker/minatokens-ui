"use server";
import { apiHandler } from "@/lib/api/api";
import { proof } from "@/lib/api/transaction/proof";
import { JobId, JobResult } from "@minatokens/api";

export default apiHandler<JobId, JobResult>({
  name: "transaction:proof",
  handler: proof,
});
