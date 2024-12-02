"use server";
import { apiHandler } from "@/lib/api";
import { tokenTransaction } from "@/lib/api/transaction";
import { BuyTransactionParams, TokenTransaction } from "@minatokens/api";

export default apiHandler<BuyTransactionParams, TokenTransaction>({
  name: "buy",
  handler: tokenTransaction,
});
