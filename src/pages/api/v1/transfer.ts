"use server";
import { apiHandler } from "@/lib/api";
import { tokenTransaction } from "@/lib/api/transaction";
import { TransferTransactionParams, TokenTransaction } from "@minatokens/api";

export default apiHandler<TransferTransactionParams, TokenTransaction>({
  name: "transfer",
  handler: tokenTransaction,
});
