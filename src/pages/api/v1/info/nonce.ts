"use server";
import { apiHandler } from "@/lib/api/api";
import { nonce } from "@/lib/api/info/token-info";
import { NonceRequestParams, NonceResponse } from "@silvana-one/api";

export default apiHandler<NonceRequestParams, NonceResponse>({
  name: "info:nonce",
  handler: nonce,
});
