"use server";
import { apiHandler } from "@/lib/api";
import { deployToken } from "@/lib/api/deploy";
import { DeployTokenParams, DeployTransaction } from "@/lib/api/types";

export default apiHandler<DeployTokenParams, DeployTransaction>({
  name: "deploy",
  handler: deployToken,
});
