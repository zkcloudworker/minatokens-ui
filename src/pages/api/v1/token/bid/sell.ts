"use server";
import { apiHandler } from "@/lib/api/api";
import { tokenTransaction } from "@/lib/api/token/transaction";
import { TokenSellTransactionParams, TokenTransaction } from "@minatokens/api";

export default apiHandler<TokenSellTransactionParams, TokenTransaction>({
  name: "token:bid:sell",
  handler: tokenTransaction,
});
