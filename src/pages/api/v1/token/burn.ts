"use server";
import { apiHandler } from "@/lib/api/api";
import { tokenTransaction } from "@/lib/api/token/transaction";
import { TokenBurnTransactionParams, TokenTransaction } from "@minatokens/api";

export default apiHandler<TokenBurnTransactionParams, TokenTransaction>({
  name: "token:burn",
  handler: tokenTransaction,
});
