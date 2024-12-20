"use server";
import { apiHandler } from "@/lib/api/api";
import { tokenTransaction } from "@/lib/api/token/transaction";
import {
  TokenTransferTransactionParams,
  TokenTransaction,
} from "@minatokens/api";

export default apiHandler<TokenTransferTransactionParams, TokenTransaction>({
  name: "token:transfer",
  handler: tokenTransaction,
});
