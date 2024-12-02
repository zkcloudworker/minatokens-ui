"use server";
import { apiHandler } from "@/lib/api";
import { tokenTransaction } from "@/lib/api/transaction";
import {
  WithdrawBidTransactionParams,
  TokenTransaction,
} from "@minatokens/api";

export default apiHandler<WithdrawBidTransactionParams, TokenTransaction>({
  name: "withdrawBid",
  handler: tokenTransaction,
});
