"use server";
import { apiHandler } from "@/lib/api/api";
import { tokenTransaction } from "@/lib/api/token/transaction";
import {
  TokenWithdrawBidTransactionParams,
  TokenTransaction,
} from "@minatokens/api";

export default apiHandler<TokenWithdrawBidTransactionParams, TokenTransaction>({
  name: "token:bid:withdraw",
  handler: tokenTransaction,
});
