"use server";
import { apiHandler } from "@/lib/api";
import { deployToken } from "@/lib/api/deploy";
import { DeployTokenParams, DeployTransaction } from "@minatokens/api";

export default apiHandler<DeployTokenParams, DeployTransaction>({
  name: "deploy",
  handler: deployToken,
});
