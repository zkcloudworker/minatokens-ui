"use server";
import { apiHandler } from "@/lib/api/api";
import { getTokenState } from "@/lib/api/info/token-info";
import { TokenInfoRequestParams, TokenState } from "@minatokens/api";

export default apiHandler<TokenInfoRequestParams, TokenState>({
  name: "info:token",
  handler: getTokenState,
});
