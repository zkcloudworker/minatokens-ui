"use server";
import { apiHandler } from "@/lib/api";
import { balance } from "@/lib/api/token-info";
import { BalanceRequestParams, BalanceResponse } from "@minatokens/api";

export default apiHandler<BalanceRequestParams, BalanceResponse>({
  name: "balance",
  handler: balance,
});
