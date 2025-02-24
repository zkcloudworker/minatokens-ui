"use server";
import { apiHandler } from "@/lib/api/api";
import { getNFTState } from "@/lib/api/info/nft-info";
import { NftRequestParams, NftRequestAnswer } from "@silvana-one/api";

export default apiHandler<NftRequestParams, NftRequestAnswer>({
  name: "info:nft",
  handler: getNFTState,
});
