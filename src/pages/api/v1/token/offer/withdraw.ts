"use server";
import { apiHandler } from "@/lib/api/api";
import { tokenTransaction } from "@/lib/api/token/transaction";
import {
  TokenWithdrawOfferTransactionParams,
  TokenTransaction,
} from "@silvana-one/api";

export default apiHandler<
  TokenWithdrawOfferTransactionParams,
  TokenTransaction
>({
  name: "token:offer:withdraw",
  handler: tokenTransaction,
});
