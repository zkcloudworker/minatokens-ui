"use client";
import { TimeLineItem } from "@/components/launch/TimeLine";
export type GroupId = "pin" | "deploy" | "mint";
export type LineId =
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

export type UpdateTimelineItemFunction = (params: {
  groupId: GroupId;
  update: TimeLineItem;
}) => void;

export const messages: { [key in LineId]: TimeLineItem } = {
  verifyData: {
    lineId: "verifyData",
    content: "Verifying data...",
    status: "waiting",
  },
  mintDataError: {
    lineId: "mintDataError",
    content: "Mint data error",
    status: "error",
  },
  o1js: {
    lineId: "o1js",
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
    status: "waiting",
  },

  adminRequired: {
    lineId: "adminRequired",
    content: "Admin address is required to launch a token",
    status: "error",
  },
  adminAddressDoNotMatch: {
    lineId: "adminAddressDoNotMatch",
    content: "Admin address does not match with wallet address",
    status: "error",
  },
  noAuroWallet: {
    lineId: "noAuroWallet",
    content: "No Auro Wallet found",
    status: "error",
  },
  pinningImage: {
    lineId: "pinningImage",
    content: "Pinning token image to Arweave permanent storage...",
    status: "waiting",
  },
  pinningMetadata: {
    lineId: "pinningMetadata",
    content: "Pinning token metadata to Arweave permanent storage...",
    status: "waiting",
  },
  saveDeployParams: {
    lineId: "saveDeployParams",
    content: "Saving token private keys to a JSON file...",
    status: "waiting",
  },
  transaction: {
    lineId: "transaction",
    content: "Preparing the transaction for token deployment...",
    status: "waiting",
  },
  error: {
    lineId: "error",
    content: "Error launching token",
    status: "error",
  },
  accountNotFound: {
    lineId: "accountNotFound",
    content: "Account not found",
    status: "error",
  },
  insufficientBalance: {
    lineId: "insufficientBalance",
    content: "Insufficient balance",
    status: "error",
  },
  noUserSignature: {
    lineId: "noUserSignature",
    content: "No user signature received",
    status: "error",
  },

  deployTransactionProveJobFailed: {
    lineId: "deployTransactionProveJobFailed",
    content: "Deploy transaction prove job failed",
    status: "error",
  },

  deployTransactionError: {
    lineId: "deployTransactionError",
    content: "Deploy transaction error",
    status: "error",
  },
  contractVerification: {
    lineId: "contractVerification",
    content: "Verifying token contract state...",
    status: "waiting",
  },
  mintingTokens: {
    lineId: "mintingTokens",
    content: "Minting tokens...",
    status: "waiting",
  },
};
