"use server";
import { apiHandler } from "@/lib/api";
import { deployToken } from "@/lib/api/deploy";
import {
  LaunchTokenStandardAdminParams,
  LaunchTokenAdvancedAdminParams,
  DeployTransaction,
} from "@minatokens/api";

export default apiHandler<
  LaunchTokenStandardAdminParams | LaunchTokenAdvancedAdminParams,
  DeployTransaction
>({
  name: "launch",
  handler: deployToken,
});
