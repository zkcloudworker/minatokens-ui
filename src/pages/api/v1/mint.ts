"use server";
import { apiHandler } from "@/lib/api";
import { tokenTransaction } from "@/lib/api/transaction";
import { MintTransactionParams, TokenTransaction } from "@minatokens/api";

export default apiHandler<MintTransactionParams, TokenTransaction>({
  name: "mint",
  handler: tokenTransaction,
});
