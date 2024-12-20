"use server";
import { apiHandler } from "@/lib/api/api";
import { getNFTState } from "@/lib/api/info/nft-v2";
import { NFTRequestParams, NFTRequestAnswer } from "@minatokens/api";

export default apiHandler<NFTRequestParams, NFTRequestAnswer>({
  name: "info:nft-v2",
  handler: getNFTState,
});
