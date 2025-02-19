"use server";
import { apiHandler } from "@/lib/api/api";
import { faucet } from "@/lib/api/faucet";
import { FaucetParams, FaucetResponse } from "@silvana-one/api";

export default apiHandler<FaucetParams, FaucetResponse>({
  name: "faucet",
  handler: faucet,
});
