import { UpdateLogListFunction, MessageId, LogItemId } from "./messages";
import { getResult } from "@/lib/token-api";
import { TokenInfo } from "@/lib/token";
import { getTxStatusFast } from "@/lib/txstatus-fast";
import { verifyFungibleTokenState } from "@/lib/verify";
import { sleep } from "@/lib/sleep";
import { debug } from "@/lib/debug";
import { updateLogItem } from "../TimeLine";
const DEBUG = debug();

export async function waitForProveJob(params: {
  jobId: string;
  id: LogItemId;
  itemToUpdate: MessageId;
  updateLogList: UpdateLogListFunction;
}): Promise<string | undefined> {
  const { jobId, id, itemToUpdate, updateLogList } = params;

  await sleep(10000);
  let result = await getResult(jobId);
  while (result?.tx === undefined && result?.error === undefined) {
    await sleep(10000);
    result = await getResult(jobId);
  }

  if (result?.error || result?.tx === undefined) {
    updateLogList({
      id,
      itemToUpdate,
      updatedItem: result.error ?? "Failed to prove transaction",
      status: "error",
    });
    return undefined;
  }

  const txSuccessMsg = (
    <>
      Deploy transaction successfully signed and{" "}
      <a
        href={`https://zkcloudworker.com/job/${jobId}`}
        className="text-accent hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        proved
      </a>{" "}
      , sending it...
    </>
  );

  updateLogList({
    id,
    itemToUpdate,
    updatedItem: txSuccessMsg,
  });

  return result.tx;
}

export async function waitForMinaDeployTx(params: {
  hash: string;
  jobId: string;
  id: LogItemId;
  itemToUpdate: MessageId;
  updateLogList: UpdateLogListFunction;
}): Promise<boolean> {
  const { hash, id, itemToUpdate, updateLogList, jobId } = params;

  let ok = await getTxStatusFast({ hash });
  let count = 0;
  if (DEBUG)
    console.log("Waiting for Mina transaction to be mined...", status, ok);
  while (!ok && count < 100) {
    await sleep(10000);
    ok = await getTxStatusFast({ hash });
    count++;
  }
  if (DEBUG) console.log("Final tx status", { ok, count });
  if (!ok) {
    updateLogList({
      id,
      itemToUpdate,
      updatedItem: "Failed to deploy token contract",
      status: "error",
    });
    return false;
  }
  const successSentMsg = (
    <>
      Deployment transaction successfully signed,{" "}
      <a
        href={`https://zkcloudworker.com/job/${jobId}`}
        className="text-accent hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        proved
      </a>{" "}
      , and{" "}
      <a
        href={`https://minascan.io/devnet/tx/${hash}?type=zk-tx`}
        className="text-accent hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        included
      </a>{" "}
      in the block
    </>
  );

  updateLogList({
    id,
    itemToUpdate,
    updatedItem: successSentMsg,
  });
  return true;
}

export async function waitForContractVerification(params: {
  tokenContractAddress: string;
  adminContractAddress: string;
  adminAddress: string;
  id: LogItemId;
  itemToUpdate: MessageId;
  updateLogList: UpdateLogListFunction;
  info: TokenInfo;
}): Promise<boolean> {
  const {
    id,
    itemToUpdate,
    updateLogList,
    tokenContractAddress,
    adminContractAddress,
    adminAddress,
    info,
  } = params;
  updateLogList({
    id,
    itemToUpdate,
    updatedItem: "Verifying the token contract state...",
  });
  let count = 0;
  const timestamp = Date.now();
  let verified = await verifyFungibleTokenState({
    tokenContractAddress,
    adminContractAddress,
    adminAddress,
    info,
    created: timestamp,
    updated: timestamp,
  });
  if (DEBUG)
    console.log("Waiting for contract state to be verified...", verified);
  while (!verified && count++ < 100) {
    if (DEBUG)
      console.log("Waiting for contract state to be verified...", verified);
    await sleep(10000);
    verified = await verifyFungibleTokenState({
      tokenContractAddress,
      adminContractAddress,
      adminAddress,
      info,
      created: timestamp,
      updated: timestamp,
    });
  }
  if (DEBUG) console.log("Final status", { verified, count });
  if (!verified) {
    updateLogList({
      id,
      itemToUpdate,
      updatedItem: "Failed to verify token contract state",
      status: "error",
    });
    return false;
  }
  updateLogList({
    id,
    itemToUpdate,
    updatedItem: "Token contract state is verified",
    status: "success",
  });
  return true;
}
