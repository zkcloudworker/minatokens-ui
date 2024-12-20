"use server";
import { apiHandler } from "@/lib/api/api";
import { airdropTransaction } from "@/lib/api/token/transaction";
import {
  TokenAirdropTransactionParams,
  TokenTransactions,
} from "@minatokens/api";

export default apiHandler<TokenAirdropTransactionParams, TokenTransactions>({
  name: "token:airdrop",
  handler: airdropTransaction,
});
