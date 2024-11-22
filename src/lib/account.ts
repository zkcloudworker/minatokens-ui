"use server";
import { fetchMinaAccount, initBlockchain } from "./blockchain";
import { Mina, PublicKey } from "o1js";

export async function accountExists(address: string): Promise<boolean> {
  try {
    await initBlockchain();
    const publicKey = PublicKey.fromBase58(address);
    await fetchMinaAccount({ publicKey, force: false });
    return Mina.hasAccount(publicKey);
  } catch (error) {
    return false;
  }
}
