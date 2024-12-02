"use server";
import { apiHandler } from "@/lib/api";
import { tokenTransaction } from "@/lib/api/transaction";
import {
  WithdrawOfferTransactionParams,
  TokenTransaction,
} from "@minatokens/api";

export default apiHandler<WithdrawOfferTransactionParams, TokenTransaction>({
  name: "withdrawOffer",
  handler: tokenTransaction,
});
