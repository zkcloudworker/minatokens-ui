"use server";
import { apiHandler } from "@/lib/api/api";
import { balance } from "@/lib/api/info/token-info";
import { BalanceRequestParams, BalanceResponse } from "@minatokens/api";

export default apiHandler<BalanceRequestParams, BalanceResponse>({
  name: "info:balance",
  handler: balance,
});
