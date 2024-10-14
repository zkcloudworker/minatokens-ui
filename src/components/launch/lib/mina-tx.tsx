import { UpdateTimelineItemFunction, GroupId, LineId } from "./messages";
import { getResult } from "@/lib/token-api";
import { TokenInfo } from "@/lib/token";
import { getTxStatusFast } from "@/lib/txstatus-fast";
import { verifyFungibleTokenState } from "@/lib/verify";
import { sleep } from "@/lib/sleep";
import { debug } from "@/lib/debug";
const DEBUG = debug();

export async function waitForProveJob(params: {
  jobId: string;
  groupId: GroupId;
  lineId: LineId;
  updateTimelineItem: UpdateTimelineItemFunction;
}): Promise<string | undefined> {
  const { jobId, groupId, lineId, updateTimelineItem } = params;

  await sleep(10000);
  let result = await getResult(jobId);
  while (result?.tx === undefined && result?.error === undefined) {
    await sleep(10000);
    result = await getResult(jobId);
  }

  if (result?.error || result?.tx === undefined) {
    updateTimelineItem({
      groupId,
      update: {
        lineId,
        content: result.error ?? "Failed to prove transaction",
        status: "error",
      },
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

  updateTimelineItem({
    groupId,
    update: {
      lineId,
      content: txSuccessMsg,
      status: "waiting",
    },
  });

  return result.tx;
}

export async function waitForMinaDeployTx(params: {
  hash: string;
  jobId: string;
  groupId: GroupId;
  lineId: LineId;
  updateTimelineItem: UpdateTimelineItemFunction;
}): Promise<boolean> {
  const { hash, jobId, groupId, lineId, updateTimelineItem } = params;
  const txSentMsg = (
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
        sent
      </a>
      , waiting for it to be included in the block
    </>
  );

  updateTimelineItem({
    groupId,
    update: {
      lineId,
      content: txSentMsg,
      status: "waiting",
    },
  });

  let ok = await getTxStatusFast({ hash });
  let count = 0;
  if (DEBUG)
    console.log("Waiting for Mina transaction to be mined...", { hash, ok });
  while (!ok && count < 100) {
    await sleep(10000);
    ok = await getTxStatusFast({ hash });
    count++;
  }
  if (DEBUG) console.log("Final tx status", { ok, count });
  if (!ok) {
    updateTimelineItem({
      groupId,
      update: {
        lineId,
        content: "Failed to deploy token contract",
        status: "error",
      },
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

  updateTimelineItem({
    groupId,
    update: {
      lineId,
      content: "Verifying the token contract state...",
      status: "waiting",
    },
  });
  updateTimelineItem({
    groupId,
    update: {
      lineId,
      content: successSentMsg,
      status: "success",
    },
  });
  return true;
}

export async function waitForContractVerification(params: {
  tokenContractAddress: string;
  adminContractAddress: string;
  adminAddress: string;
  groupId: GroupId;
  lineId: LineId;
  updateTimelineItem: UpdateTimelineItemFunction;
  info: TokenInfo;
}): Promise<boolean> {
  const {
    groupId,
    lineId,
    updateTimelineItem,
    tokenContractAddress,
    adminContractAddress,
    adminAddress,
    info,
  } = params;

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
    updateTimelineItem({
      groupId,
      update: {
        lineId,
        content: "Failed to verify token contract state",
        status: "error",
      },
    });
    return false;
  }
  updateTimelineItem({
    groupId,
    update: {
      lineId,
      content: "Token contract state is verified",
      status: "success",
    },
  });
  return true;
}
