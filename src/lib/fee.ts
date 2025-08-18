"use server";
import { getChain } from "./chain";
import { fetchZekoFee } from "@silvana-one/api";
import { log as logtail } from "@logtail/next";
const chain = getChain();
const log = logtail.with({
  service: "fee",
  chain,
});

const DEFAULT_ZEKO_FEE = 500_000_000;

export async function getFee(params: {
  params: {
    weight: number;
  };
}): Promise<number> {
  const { weight } = params.params;
  if (chain !== "zeko") return 200_000_000;
  try {
    if (weight === undefined || typeof weight !== "number") {
      log.error("getFee: zeko weight is undefined or not a number", { weight });
      return DEFAULT_ZEKO_FEE;
    }
    const fee = await fetchZekoFee({ weight });
    if (fee === undefined || typeof fee !== "number") {
      log.error("getFee: fetched zeko fee is undefined or not a number", {
        fee,
        weight,
      });
      return DEFAULT_ZEKO_FEE;
    }
    return fee;
  } catch (error) {
    log.error("getFee: catch error", { error });
    return DEFAULT_ZEKO_FEE;
  }
}
