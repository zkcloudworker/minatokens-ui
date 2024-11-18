"use server";
import { apiHandler } from "@/lib/api";
import { getNFTState } from "@/lib/api/nft";
import { NFTRequestParams, NFTRequestAnswer } from "@/lib/api/types";

export default apiHandler<NFTRequestParams, NFTRequestAnswer>({
  name: "nft",
  handler: getNFTState,
});
