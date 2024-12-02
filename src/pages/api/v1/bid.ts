"use server";
import { apiHandler } from "@/lib/api";
import { tokenTransaction } from "@/lib/api/transaction";
import { BidTransactionParams, TokenTransaction } from "@minatokens/api";

export default apiHandler<BidTransactionParams, TokenTransaction>({
  name: "bid",
  handler: tokenTransaction,
});
