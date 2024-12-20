"use server";
import { apiHandler } from "@/lib/api/api";
import { tokenTransaction } from "@/lib/api/token/transaction";
import { TokenMintTransactionParams, TokenTransaction } from "@minatokens/api";

export default apiHandler<TokenMintTransactionParams, TokenTransaction>({
  name: "token:mint",
  handler: tokenTransaction,
});
