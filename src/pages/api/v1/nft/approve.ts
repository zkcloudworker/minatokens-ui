"use server";
import { apiHandler } from "@/lib/api/api";
import { nftTransaction } from "@/lib/api/nft/transaction";
import { NftApproveTransactionParams, NftTransaction } from "@silvana-one/api";

export default apiHandler<NftApproveTransactionParams, NftTransaction>({
  name: "nft:approve",
  handler: nftTransaction,
});
