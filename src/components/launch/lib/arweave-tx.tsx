import { UpdateTimelineItemFunction, LineId, GroupId } from "./messages";
import { arweaveTxStatus } from "@/lib/arweave";
import { sleep } from "@/lib/sleep";
import { debug } from "@/lib/debug";
const DEBUG = debug();

export async function waitForArweaveTx(params: {
  hash: string;
  groupId: GroupId;
  lineId: LineId;
  updateTimelineItem: UpdateTimelineItemFunction;
  type: "image" | "metadata";
}): Promise<boolean> {
  const { hash, groupId, lineId, updateTimelineItem, type } = params;

  let status = await arweaveTxStatus(hash);
  while (status.success && !status.data?.confirmed) {
    await sleep(10000);
    status = await arweaveTxStatus(hash);
  }
  if (DEBUG) console.log("Arweave transaction mined", status);
  if (
    !status.success ||
    !status.data?.confirmed ||
    !status.data?.confirmed?.number_of_confirmations ||
    Number(status.data?.confirmed?.number_of_confirmations) < 1
  ) {
    const txFailedMessage = (
      <>
        <a
          href={`https://arscan.io/tx/${hash}`}
          className="text-accent hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Pinning
        </a>{" "}
        token {type} to Arweave permanent storage failed
      </>
    );
    updateTimelineItem({
      groupId,
      update: {
        lineId,
        content: txFailedMessage,
        status: "error",
      },
    });
    return false;
  }
  const txSuccessMessage = (
    <>
      Token{" "}
      <a
        href={status.url}
        className="text-accent hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {type}
      </a>{" "}
      successfully{" "}
      <a
        href={`https://arscan.io/tx/${hash}`}
        className="text-accent hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        pinned
      </a>{" "}
      to Arweave permanent storage
    </>
  );
  updateTimelineItem({
    groupId,
    update: {
      lineId,
      content: txSuccessMessage,
      status: "success",
    },
  });
  if (DEBUG) console.log("Arweave URL for", type, status.url);
  return true;
}
