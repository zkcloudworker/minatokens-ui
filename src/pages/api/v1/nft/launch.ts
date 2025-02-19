"use server";
import { apiHandler } from "@/lib/api/api";
import { launchNftCollection } from "@/lib/api/nft/launch";
import {
  LaunchNftCollectionStandardAdminParams,
  LaunchNftCollectionAdvancedAdminParams,
  NftTransaction,
} from "@silvana-one/api";

export default apiHandler<
  | LaunchNftCollectionStandardAdminParams
  | LaunchNftCollectionAdvancedAdminParams,
  NftTransaction
>({
  name: "nft:launch",
  handler: launchNftCollection,
});
