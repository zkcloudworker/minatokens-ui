"use server";
import { apiHandler } from "@/lib/api/api";
import { getTransactions } from "@/lib/api/info/blockberry";
import {
  TransactionsListRequestParams,
  TransactionsListResponse,
} from "@silvana-one/api";

export default apiHandler<
  TransactionsListRequestParams,
  TransactionsListResponse
>({
  name: "info:transactions",
  handler: getTransactions,
});
