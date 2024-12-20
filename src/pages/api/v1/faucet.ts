"use server";
import { apiHandler } from "@/lib/api/api";
import { faucet } from "@/lib/api/faucet";
import { FaucetParams, FaucetResponse } from "@minatokens/api";

export default apiHandler<FaucetParams, FaucetResponse>({
  name: "faucet",
  handler: faucet,
});
