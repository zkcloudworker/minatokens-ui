"use server";
import { apiHandler } from "@/lib/api/api";
import { upgradeTxHandler, UpgradeTxParams } from "@/lib/api/mesa-upgrade";

export default apiHandler<UpgradeTxParams, { payloads: any; name: string }>({
  name: "transaction:upgrade",
  handler: upgradeTxHandler,
});
