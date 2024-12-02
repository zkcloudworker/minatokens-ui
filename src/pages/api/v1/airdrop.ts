"use server";
import { apiHandler } from "@/lib/api";
import { airdropTransaction, tokenTransaction } from "@/lib/api/transaction";
import { AirdropTransactionParams, TokenTransactions } from "@minatokens/api";

export default apiHandler<AirdropTransactionParams, TokenTransactions>({
  name: "airdrop",
  handler: airdropTransaction,
});
