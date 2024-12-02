"use server";
import { apiHandler } from "@/lib/api";
import { tokenTransaction } from "@/lib/api/transaction";
import { OfferTransactionParams, TokenTransaction } from "@minatokens/api";

export default apiHandler<OfferTransactionParams, TokenTransaction>({
  name: "offer",
  handler: tokenTransaction,
});
