"use server";
import { apiHandler } from "@/lib/api";
import { tokenTransaction } from "@/lib/api/transaction";
import {
  UpdateBidWhitelistTransactionParams,
  TokenTransaction,
} from "@minatokens/api";

export default apiHandler<
  UpdateBidWhitelistTransactionParams,
  TokenTransaction
>({
  name: "updateBidWhitelist",
  handler: tokenTransaction,
});
