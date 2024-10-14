import { UpdateLogListFunction, MessageId, LogItemId } from "./messages";
import { arweaveTxStatus } from "@/lib/arweave";
import { sleep } from "@/lib/sleep";
import { debug } from "@/lib/debug";
const DEBUG = debug();

export async function waitForArweaveTx(params: {
  hash: string;
  id: LogItemId;
  itemToUpdate: MessageId;
  updateLogList: UpdateLogListFunction;
  type: "image" | "metadata";
}): Promise<boolean> {
  const { hash, id, itemToUpdate, type, updateLogList } = params;

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
    updateLogList({
      id,
      itemToUpdate,
      status: "error",
      updatedItem: txFailedMessage,
    });
    return false;
  }
  const txSuccessMessage = (
    <>
      Token{" "}
      <a href={status.url} className="text-accent hover:underline">
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
  updateLogList({
    id,
    itemToUpdate,
    updatedItem: txSuccessMessage,
  });
  if (DEBUG) console.log("Arweave URL for", type, status.url);
  return true;
}
