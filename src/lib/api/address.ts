import { PublicKey } from "o1js";

export function checkAddress(address: string | undefined): boolean {
  if (!address || typeof address !== "string") {
    console.error("checkAddress params are invalid:", address);
    return false;
  }
  try {
    const publicKey = PublicKey.fromBase58(address);
    if (address !== publicKey.toBase58()) {
      console.log(
        "checkAddress: address is not valid",
        address,
        publicKey.toBase58()
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("checkAddress catch", { address, error });
    return false;
  }
}
