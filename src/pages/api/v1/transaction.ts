"use server";
import { apiHandler } from "@/lib/api";
import { tokenTransaction } from "@/lib/api/transaction";
import { TransactionTokenParams, TokenTransaction } from "@minatokens/api";

export default apiHandler<TransactionTokenParams, TokenTransaction>({
  name: "transaction",
  handler: tokenTransaction,
});
