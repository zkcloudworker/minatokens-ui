"use server";
import { apiHandler } from "@/lib/api/api";
import { tokenTransaction } from "@/lib/api/token/transaction";
import { TokenOfferTransactionParams, TokenTransaction } from "@minatokens/api";

export default apiHandler<TokenOfferTransactionParams, TokenTransaction>({
  name: "token:offer:create",
  handler: tokenTransaction,
});
