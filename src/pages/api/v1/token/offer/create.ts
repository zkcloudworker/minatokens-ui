"use server";
import { apiHandler } from "@/lib/api/api";
import { tokenTransaction } from "@/lib/api/token/transaction";
import {
  TokenOfferTransactionParams,
  TokenTransaction,
} from "@silvana-one/api";

export default apiHandler<TokenOfferTransactionParams, TokenTransaction>({
  name: "token:offer:create",
  handler: tokenTransaction,
});
