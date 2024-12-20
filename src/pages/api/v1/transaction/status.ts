"use server";
import { apiHandler } from "@/lib/api/api";
import { getTransactionStatus } from "@/lib/api/transaction/tx-status";
import { TransactionStatusParams, TransactionStatus } from "@minatokens/api";

export default apiHandler<TransactionStatusParams, TransactionStatus>({
  name: "transaction:status",
  handler: getTransactionStatus,
});
