"use server";
import { apiHandler } from "@/lib/api/api";
import { nftTransaction } from "@/lib/api/nft/transaction";
import { NftTransferTransactionParams, NftTransaction } from "@silvana-one/api";

export default apiHandler<NftTransferTransactionParams, NftTransaction>({
  name: "nft:transfer",
  handler: nftTransaction,
});
