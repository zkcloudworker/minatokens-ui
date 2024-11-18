"use server";
import { apiHandler } from "@/lib/api";
import { getTransactionStatus } from "@/lib/api/tx-status";
import { TransactionStatusParams, TransactionStatus } from "@/lib/api/types";

export default apiHandler<TransactionStatusParams, TransactionStatus>({
  name: "tx-status",
  handler: getTransactionStatus,
});
