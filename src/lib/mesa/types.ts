import type { Chain, MesaAccountType, MesaKeyOperation } from "@prisma/client";

export type MesaKeySource = "client" | "api";

export interface SaveMesaPrivateKeyInput {
  /** Base58 Mina public key (primary key). */
  publicKey: string;
  /** Base58 Mina private key (plaintext; encrypted before storage). */
  privateKey: string;
  /** Connected wallet / transaction sender, if known. */
  walletAddress?: string | null;
  operation: MesaKeyOperation;
  accountType: MesaAccountType;
  /** Parent token/collection address when accountType is TOKEN. */
  mainAccountPublicKey?: string | null;
  chain: Chain;
  source?: MesaKeySource;
  context?: Record<string, unknown> | null;
}

/** Everything the Mesa upgrade modal shows for one account. */
export interface MesaUpgradeInfo {
  name: string;
  address: string;
  tokenId: string;
  isDefaultTokenId: boolean;
  currentVk: { hash: string; data: string };
  newVk: { hash: string; data: string } | null;
  savedInDb: boolean;
}
