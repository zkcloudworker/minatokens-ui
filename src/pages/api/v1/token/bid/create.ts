"use server";
import { apiHandler } from "@/lib/api/api";
import { tokenTransaction } from "@/lib/api/token/transaction";
import { TokenBidTransactionParams, TokenTransaction } from "@minatokens/api";

export default apiHandler<TokenBidTransactionParams, TokenTransaction>({
  name: "token:bid:create",
  handler: tokenTransaction,
});
