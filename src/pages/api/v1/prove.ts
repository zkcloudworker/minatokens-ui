"use server";
import { apiHandler } from "@/lib/api";
import { prove } from "@/lib/api/prove";
import {
  ProveTokenTransactions,
  JobId,
  ProveTokenTransaction,
} from "@minatokens/api";

export default apiHandler<
  ProveTokenTransactions | ProveTokenTransaction,
  JobId
>({
  name: "prove",
  handler: prove,
});
