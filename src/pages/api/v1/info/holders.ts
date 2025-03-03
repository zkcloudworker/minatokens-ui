"use server";
import { apiHandler } from "@/lib/api/api";
import { getTokenHolders } from "@/lib/api/info/blockberry";
import {
  TokenHoldersRequestParams,
  TokenHoldersResponse,
} from "@silvana-one/api";

export default apiHandler<TokenHoldersRequestParams, TokenHoldersResponse>({
  name: "info:holders",
  handler: getTokenHolders,
});
