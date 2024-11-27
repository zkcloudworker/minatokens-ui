"use server";
import { apiHandler } from "@/lib/api";
import { getNFTState } from "@/lib/api/nft";
import { NFTRequestParams, NFTRequestAnswer } from "@minatokens/api";

export default apiHandler<NFTRequestParams, NFTRequestAnswer>({
  name: "nft",
  handler: getNFTState,
});
