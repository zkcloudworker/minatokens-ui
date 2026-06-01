"use server";
import { ApiName, ApiResponse } from "./api-types";
import { getMesaUpgradeInfo, buildMesaUpgradeTx } from "@/lib/mesa/upgrade";
import type { MesaUpgradeInfo } from "@/lib/mesa/types";

export interface UpgradeTxParams {
  address: string;
  tokenId?: string;
  parentAddress?: string;
  sender: string;
  privateKey?: string;
}

export async function upgradeInfoHandler(props: {
  params: { address: string; tokenId?: string; parentAddress?: string };
  name: ApiName;
  apiKeyAddress: string;
}): Promise<ApiResponse<MesaUpgradeInfo>> {
  const result = await getMesaUpgradeInfo(props.params);
  if ("error" in result) return { status: 400, json: { error: result.error } };
  return { status: 200, json: result };
}

export async function upgradeTxHandler(props: {
  params: UpgradeTxParams;
  name: ApiName;
  apiKeyAddress: string;
}): Promise<ApiResponse<{ payloads: any; name: string }>> {
  const result = await buildMesaUpgradeTx(props.params);
  if ("error" in result) return { status: 400, json: { error: result.error } };
  return { status: 200, json: result };
}
