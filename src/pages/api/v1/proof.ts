"use server";
import { apiHandler } from "@/lib/api";
import { proof } from "@/lib/api/proof";
import { JobId, JobResult } from "@minatokens/api";

export default apiHandler<JobId, JobResult>({
  name: "proof",
  handler: proof,
});
