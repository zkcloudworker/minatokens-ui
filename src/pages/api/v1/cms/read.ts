"use server";
import { apiHandler } from "@/lib/api/api";
import {
  CmsReadNFTParams,
  CmsReadNFTResponse,
  cmsReadNFT,
} from "@/lib/api/nft/cms";

export default apiHandler<CmsReadNFTParams, CmsReadNFTResponse>({
  name: "cms:read",
  handler: cmsReadNFT,
});
