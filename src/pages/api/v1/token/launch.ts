"use server";
import { apiHandler } from "@/lib/api/api";
import { deployToken } from "@/lib/api/token/launch";
import {
  LaunchTokenStandardAdminParams,
  LaunchTokenAdvancedAdminParams,
  TokenTransaction,
} from "@silvana-one/api";

export default apiHandler<
  LaunchTokenStandardAdminParams | LaunchTokenAdvancedAdminParams,
  TokenTransaction
>({
  name: "token:launch",
  handler: deployToken,
});
