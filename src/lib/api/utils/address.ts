import { PublicKey, PrivateKey } from "o1js";

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

export function checkPrivateKey(privateKey: string | undefined): boolean {
  if (!privateKey || typeof privateKey !== "string") {
    console.error("checkPrivateKey params are invalid:", privateKey);
    return false;
  }
  try {
    const key = PrivateKey.fromBase58(privateKey);
    if (privateKey !== key.toBase58()) {
      console.log(
        "checkPrivateKey: privateKey is not valid",
        privateKey,
        key.toBase58()
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("checkPrivateKey catch", { privateKey, error });
    return false;
  }
}
