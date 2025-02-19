"use server";
import { apiHandler } from "@/lib/api/api";
import { getNFTState } from "@/lib/api/info/nft-v2";
import { NftRequestParams, NftRequestAnswer } from "@silvana-one/api";

export default apiHandler<NftRequestParams, NftRequestAnswer>({
  name: "info:nft-v2",
  handler: getNFTState,
});
