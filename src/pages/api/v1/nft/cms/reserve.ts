"use server";
import { apiHandler } from "@/lib/api/api";
import {
  CmsReserveNFTParams,
  CmsReserveNFTResponse,
  cmsReserveNFT,
} from "@/lib/api/nft/cms";

export default apiHandler<CmsReserveNFTParams, CmsReserveNFTResponse>({
  name: "cms:reserve",
  handler: cmsReserveNFT,
});
