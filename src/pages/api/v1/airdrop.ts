"use server";
import { apiHandler } from "@/lib/api";
import { tokenTransaction } from "@/lib/api/transaction";
import { AirdropTransactionParams, TokenTransaction } from "@minatokens/api";

export default apiHandler<AirdropTransactionParams, TokenTransaction>({
  name: "airdrop",
  handler: tokenTransaction,
});
