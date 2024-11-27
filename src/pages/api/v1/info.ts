"use server";
import { apiHandler } from "@/lib/api";
import { getTokenStateForApi } from "@/lib/api/token-info";
import { TokenStateRequestParams, TokenState } from "@minatokens/api";

export default apiHandler<TokenStateRequestParams, TokenState>({
  name: "info",
  handler: getTokenStateForApi,
});
