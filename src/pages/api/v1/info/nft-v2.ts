"use server";
import { apiHandler } from "@/lib/api/api";
import { getNFTState } from "@/lib/api/info/nft-v2";
import { NftRequestParams, NftV2RequestAnswer } from "@silvana-one/api";

export default apiHandler<NftRequestParams, NftV2RequestAnswer>({
  name: "info:nft-v2",
  handler: getNFTState,
});
