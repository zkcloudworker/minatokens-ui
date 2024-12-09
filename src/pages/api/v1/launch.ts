"use server";
import { apiHandler } from "@/lib/api";
import { deployToken } from "@/lib/api/deploy";
import {
  LaunchTokenStandardAdminParams,
  LaunchTokenAdvancedAdminParams,
  TokenTransaction,
} from "@minatokens/api";

export default apiHandler<
  LaunchTokenStandardAdminParams | LaunchTokenAdvancedAdminParams,
  TokenTransaction
>({
  name: "launch",
  handler: deployToken,
});
