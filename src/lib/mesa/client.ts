import { saveMesaPrivateKeys } from "@/lib/mesa/keys";
import type { SaveMesaPrivateKeyInput } from "@/lib/mesa/types";

// Sends keys to the server only when the flag is "true" (so production browsers
// never transmit private keys). FAIL-CLOSED: when enabled, the underlying server
// action retries then throws on failure, and we let that propagate so the caller
// can halt before deploying. No-op (no transmission) when the flag is off.
function enabled(): boolean {
  return process.env.NEXT_PUBLIC_MESA_TESTNET_SAVE_PRIVATE_KEYS === "true";
}

export async function saveMesaPrivateKeysIfEnabled(
  inputs: SaveMesaPrivateKeyInput[]
): Promise<void> {
  if (!enabled()) return;
  await saveMesaPrivateKeys(inputs);
}
