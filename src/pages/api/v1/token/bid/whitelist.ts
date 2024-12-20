"use server";
import { apiHandler } from "@/lib/api/api";
import { tokenTransaction } from "@/lib/api/token/transaction";
import {
  TokenUpdateBidWhitelistTransactionParams,
  TokenTransaction,
} from "@minatokens/api";

export default apiHandler<
  TokenUpdateBidWhitelistTransactionParams,
  TokenTransaction
>({
  name: "token:bid:whitelist",
  handler: tokenTransaction,
});
