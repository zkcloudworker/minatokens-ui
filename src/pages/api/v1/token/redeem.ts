"use server";
import { apiHandler } from "@/lib/api/api";
import { tokenTransaction } from "@/lib/api/token/transaction";
import {
  TokenRedeemTransactionParams,
  TokenTransaction,
} from "@minatokens/api";

export default apiHandler<TokenRedeemTransactionParams, TokenTransaction>({
  name: "token:redeem",
  handler: tokenTransaction,
});
