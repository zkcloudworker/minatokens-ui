"use server";
import { PublicKey } from "o1js";
import { MintAddress, MintAddressVerified } from "@/lib/token";

export async function checkMintData(
  params: MintAddress
): Promise<MintAddressVerified | undefined> {
  const { address, amount } = params;
  if (
    !address ||
    !amount ||
    typeof address !== "string" ||
    address === "" ||
    typeof amount !== "number" ||
    amount <= 0
  ) {
    console.error("checkMintData: params are invalid:", params);
    return undefined;
  }
  try {
    if (isNaN(amount)) {
      console.error("checkMintData: amount is invalid:", params);
      return undefined;
    }
    const publicKey = PublicKey.fromBase58(address);
    if (address !== publicKey.toBase58()) {
      console.log(
        "checkAddress: address is not valid",
        address,
        publicKey.toBase58()
      );
      return undefined;
    }
    return { address, amount };
  } catch (error) {
    console.error("checkMintData catch", error);
    return undefined;
  }
}

export async function checkAddress(
  address: string | undefined
): Promise<boolean> {
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
