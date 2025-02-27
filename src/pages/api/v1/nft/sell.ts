"use server";
import { apiHandler } from "@/lib/api/api";
import { nftTransaction } from "@/lib/api/nft/transaction";
import { NftSellTransactionParams, NftTransaction } from "@silvana-one/api";

export default apiHandler<NftSellTransactionParams, NftTransaction>({
  name: "nft:sell",
  handler: nftTransaction,
});
