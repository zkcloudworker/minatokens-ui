"use server";
import { apiHandler } from "@/lib/api/api";
import { nftTransaction } from "@/lib/api/nft/transaction";
import { NftMintTransactionParams, NftTransaction } from "@silvana-one/api";

export default apiHandler<NftMintTransactionParams, NftTransaction>({
  name: "nft:mint",
  handler: nftTransaction,
});
