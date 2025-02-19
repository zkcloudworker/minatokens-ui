"use server";
import { apiHandler } from "@/lib/api/api";
import { contract } from "@/lib/api/info/contract";
import {
  ContractInfoRequest,
  ContractInfo,
  getContractInfo,
} from "@silvana-one/api";

export default apiHandler<ContractInfoRequest, ContractInfo[]>({
  name: "info:contract",
  handler: contract,
});
