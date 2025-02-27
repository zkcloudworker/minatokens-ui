"use server";
import { apiHandler } from "@/lib/api/api";
import { nftTransaction } from "@/lib/api/nft/transaction";
import { NftBuyTransactionParams, NftTransaction } from "@silvana-one/api";

export default apiHandler<NftBuyTransactionParams, NftTransaction>({
  name: "nft:buy",
  handler: nftTransaction,
});
