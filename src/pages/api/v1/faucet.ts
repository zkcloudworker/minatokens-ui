"use server";
import { apiHandler } from "@/lib/api";
import { faucet } from "@/lib/api/faucet";
import { FaucetParams, FaucetResponse } from "@/lib/api/types";

export default apiHandler<FaucetParams, FaucetResponse>({
  name: "faucet",
  handler: faucet,
});
