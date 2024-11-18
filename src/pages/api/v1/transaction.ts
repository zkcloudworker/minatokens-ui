"use server";
import { apiHandler } from "@/lib/api";
import { tokenTransaction } from "@/lib/api/transaction";
import { TransactionTokenParams, TokenTransaction } from "@/lib/api/types";

export default apiHandler<TransactionTokenParams, TokenTransaction>({
  name: "transaction",
  handler: tokenTransaction,
});
