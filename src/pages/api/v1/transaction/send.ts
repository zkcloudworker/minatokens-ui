"use server";
import { apiHandler } from "@/lib/api/api";
import { sendTransaction } from "@/lib/api/transaction/send";
import { SendTransactionParams, SendTransactionReply } from "@silvana-one/api";

export default apiHandler<SendTransactionParams, SendTransactionReply>({
  name: "transaction:send",
  handler: sendTransaction,
});
