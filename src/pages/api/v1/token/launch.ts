"use server";
import { apiHandler } from "@/lib/api/api";
import { deployToken } from "@/lib/api/token/deploy";
import {
  LaunchTokenStandardAdminParams,
  LaunchTokenAdvancedAdminParams,
  TokenTransaction,
} from "@minatokens/api";

export default apiHandler<
  LaunchTokenStandardAdminParams | LaunchTokenAdvancedAdminParams,
  TokenTransaction
>({
  name: "token:launch",
  handler: deployToken,
});
