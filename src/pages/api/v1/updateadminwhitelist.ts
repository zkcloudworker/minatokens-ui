"use server";
import { apiHandler } from "@/lib/api";
import { tokenTransaction } from "@/lib/api/transaction";
import {
  UpdateAdminWhitelistTransactionParams,
  TokenTransaction,
} from "@minatokens/api";

export default apiHandler<
  UpdateAdminWhitelistTransactionParams,
  TokenTransaction
>({
  name: "updateAdminWhitelist",
  handler: tokenTransaction,
});
