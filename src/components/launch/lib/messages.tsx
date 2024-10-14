import { LogListItem, TimelineStatus } from "@/components/launch/TimeLine";
import { ReactNode } from "react";
export type LogItemId = "deploy" | "mint";
export type MessageId =
  | "verifyData"
  | "mintDataError"
  | "o1js"
  | "adminRequired"
  | "adminAddressDoNotMatch"
  | "noAuroWallet"
  | "pinningImage"
  | "pinningMetadata"
  | "saveDeployParams"
  | "transaction"
  | "error"
  | "accountNotFound"
  | "insufficientBalance"
  | "noUserSignature"
  | "deployTransactionProveJobFailed"
  | "deployTransactionError"
  | "contractVerification"
  | "mintingTokens";
export type UpdateLogListFunction = (params: {
  id: LogItemId;
  itemToUpdate: MessageId;
  updatedItem: ReactNode;
  status?: TimelineStatus;
}) => void;

export const messages: { [key in MessageId]: LogListItem } = {
  verifyData: { id: "verifyData", content: "Verifying data..." },
  mintDataError: {
    id: "mintDataError",
    content: "Mint data error",
  },
  o1js: {
    id: "o1js",
    content: (
      <>
        Loading{" "}
        <a
          href="https://docs.minaprotocol.com/zkapps/o1js"
          className="text-accent hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          o1js
        </a>{" "}
        library...
      </>
    ),
  },

  adminRequired: {
    id: "adminRequired",
    content: "Admin address is required to launch a token",
  },
  adminAddressDoNotMatch: {
    id: "adminAddressDoNotMatch",
    content: "Admin address does not match with wallet address",
  },
  noAuroWallet: {
    id: "noAuroWallet",
    content: "No Auro Wallet found",
  },
  pinningImage: {
    id: "pinningImage",
    content: "Pinning token image to Arweave permanent storage...",
  },
  pinningMetadata: {
    id: "pinningMetadata",
    content: "Pinning token metadata to Arweave permanent storage...",
  },
  saveDeployParams: {
    id: "saveDeployParams",
    content: "Saving token private keys to a JSON file...",
  },
  transaction: {
    id: "transaction",
    content: "Preparing the transaction for token deployment...",
  },
  error: {
    id: "error",
    content: "Error launching token",
  },
  accountNotFound: {
    id: "accountNotFound",
    content: "Account not found",
  },
  insufficientBalance: {
    id: "insufficientBalance",
    content: "Insufficient balance",
  },
  noUserSignature: {
    id: "noUserSignature",
    content: "No user signature received",
  },

  deployTransactionProveJobFailed: {
    id: "deployTransactionProveJobFailed",
    content: "Deploy transaction prove job failed",
  },

  deployTransactionError: {
    id: "deployTransactionError",
    content: "Deploy transaction error",
  },
  contractVerification: {
    id: "contractVerification",
    content: "Verifying token contract state...",
  },
  mintingTokens: {
    id: "mintingTokens",
    content: "Minting tokens...",
  },
};
