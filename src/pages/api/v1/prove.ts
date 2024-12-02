"use server";
import { apiHandler } from "@/lib/api";
import { prove } from "@/lib/api/prove";
import { ProveTokenTransactions, JobId } from "@minatokens/api";

export default apiHandler<ProveTokenTransactions, JobId>({
  name: "prove",
  handler: prove,
});
