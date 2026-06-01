"use server";
import { apiHandler } from "@/lib/api/api";
import { upgradeInfoHandler } from "@/lib/api/mesa-upgrade";
import type { MesaUpgradeInfo } from "@/lib/mesa/types";

export default apiHandler<
  { address: string; tokenId?: string; parentAddress?: string },
  MesaUpgradeInfo
>({
  name: "info:upgrade",
  handler: upgradeInfoHandler,
});
