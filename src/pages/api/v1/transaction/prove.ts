"use server";
import { apiHandler } from "@/lib/api/api";
import { prove } from "@/lib/api/transaction/prove";
import {
  ProveTokenTransactions,
  JobId,
  ProveTokenTransaction,
} from "@minatokens/api";

export default apiHandler<
  ProveTokenTransactions | ProveTokenTransaction,
  JobId
>({
  name: "transaction:prove",
  handler: prove,
});
