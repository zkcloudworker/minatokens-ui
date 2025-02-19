"use server";
import { apiHandler } from "@/lib/api/api";
import { getTransactionStatus } from "@/lib/api/transaction/status";
import { TransactionStatusParams, TransactionStatus } from "@silvana-one/api";

export default apiHandler<TransactionStatusParams, TransactionStatus>({
  name: "transaction:status",
  handler: getTransactionStatus,
});
