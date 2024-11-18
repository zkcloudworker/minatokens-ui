"use server";
import { apiHandler } from "@/lib/api";
import { proveToken } from "@/lib/api/prove";
import { ProveTokenTransaction, JobId } from "@/lib/api/types";

export default apiHandler<ProveTokenTransaction, JobId>({
  name: "prove",
  handler: proveToken,
});
