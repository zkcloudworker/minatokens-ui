"use server";
import { apiHandler } from "@/lib/api/api";
import { tokenTransaction } from "@/lib/api/token/transaction";
import { TokenBuyTransactionParams, TokenTransaction } from "@silvana-one/api";

export default apiHandler<TokenBuyTransactionParams, TokenTransaction>({
  name: "token:offer:buy",
  handler: tokenTransaction,
});
