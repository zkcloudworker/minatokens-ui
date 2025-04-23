"use server";
import { apiHandler } from "@/lib/api/api";
import {
  CmsStoreNFTParams,
  CmsStoreNFTResponse,
  cmsStoreNFT,
} from "@/lib/api/nft/cms";

export default apiHandler<CmsStoreNFTParams, CmsStoreNFTResponse>({
  name: "cms:store",
  handler: cmsStoreNFT,
});
