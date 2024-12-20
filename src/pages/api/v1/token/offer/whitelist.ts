"use server";
import { apiHandler } from "@/lib/api/api";
import { tokenTransaction } from "@/lib/api/token/transaction";
import {
  TokenUpdateOfferWhitelistTransactionParams,
  TokenTransaction,
} from "@minatokens/api";

export default apiHandler<
  TokenUpdateOfferWhitelistTransactionParams,
  TokenTransaction
>({
  name: "token:offer:whitelist",
  handler: tokenTransaction,
});
