"use server";
import { apiHandler } from "@/lib/api";
import { tokenTransaction } from "@/lib/api/transaction";
import { SellTransactionParams, TokenTransaction } from "@minatokens/api";

export default apiHandler<SellTransactionParams, TokenTransaction>({
  name: "offer",
  handler: tokenTransaction,
});
