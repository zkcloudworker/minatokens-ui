"use server";
import { apiHandler } from "@/lib/api";
import { balance } from "@/lib/api/token-info";
import { BalanceRequestParams, BalanceResponse } from "@/lib/api/types";

export default apiHandler<BalanceRequestParams, BalanceResponse>({
  name: "balance",
  handler: balance,
});
