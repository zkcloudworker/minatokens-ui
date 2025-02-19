"use server";
import { SendTransactionParams, SendTransactionReply } from "@silvana-one/api";
import { ApiName, ApiResponse } from "../api-types";
import { sendTransaction as sendTransactionInternal } from "@/lib/send";

export async function sendTransaction(props: {
  params: SendTransactionParams;
  name: ApiName;
  apiKeyAddress: string;
}): Promise<ApiResponse<SendTransactionReply>> {
  const { params, name, apiKeyAddress } = props;
  console.log("sendTransaction", params);
  const { transaction } = params;
  try {
    if (
      !transaction ||
      typeof transaction !== "string" ||
      transaction.length === 0
    ) {
      return {
        status: 400,
        json: { error: "Invalid transaction" },
      };
    }

    const result = await sendTransactionInternal(transaction);
    return {
      status: 200,
      json: result,
    };
  } catch (error: any) {
    console.error("sendTransaction catch", error);
    return {
      status: 500,
      json: {
        error: error?.message ?? (error ? String(error) : "unknown error"),
      },
    };
  }
}
