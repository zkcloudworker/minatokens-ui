"use server";
import { apiHandler } from "@/lib/api";
import { tokenTransaction } from "@/lib/api/transaction";
import {
  UpdateOfferWhitelistTransactionParams,
  TokenTransaction,
} from "@minatokens/api";

export default apiHandler<
  UpdateOfferWhitelistTransactionParams,
  TokenTransaction
>({
  name: "updateOfferWhitelist",
  handler: tokenTransaction,
});
