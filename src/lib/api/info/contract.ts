"use server";
import { initBlockchain } from "@/lib/blockchain";
import { ContractInfoRequest, ContractInfo } from "@minatokens/api";
import { getContractInfo } from "@minatokens/abi";
import { ApiName, ApiResponse } from "../api-types";
import { checkAddress } from "../utils/address";
import { getChain } from "@/lib/chain";
const chain = getChain() === "mainnet" ? "mainnet" : "devnet";

import { debug } from "@/lib/debug";
const DEBUG = debug();

export async function contract(props: {
  params: ContractInfoRequest;
  name: ApiName;
  apiKeyAddress: string;
}): Promise<ApiResponse<ContractInfo[]>> {
  const { params, name, apiKeyAddress } = props;
  const { address, tokenId } = params;

  try {
    await initBlockchain();

    if (!address || !checkAddress(address)) {
      return {
        status: 400,
        json: { error: "Invalid address" },
      };
    }

    const contractInfo = await getContractInfo({ address, tokenId, chain });
    return {
      status: 200,
      json: contractInfo,
    };
  } catch (error) {
    console.error("contract catch", params, error);
    return {
      status: 500,
      json: { error: "Failed to get contract info" },
    };
  }
}
