"use server";
import { apiHandler } from "@/lib/api/api";
import { tokenTransaction } from "@/lib/api/token/transaction";
import {
  TokenUpdateAdminWhitelistTransactionParams,
  TokenTransaction,
} from "@minatokens/api";

export default apiHandler<
  TokenUpdateAdminWhitelistTransactionParams,
  TokenTransaction
>({
  name: "token:admin:whitelist",
  handler: tokenTransaction,
});
