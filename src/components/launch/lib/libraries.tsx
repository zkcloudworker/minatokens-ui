import { UpdateLogListFunction, MessageId, LogItemId } from "./messages";
import { loadLibraries, Libraries } from "@/lib/libraries";

export async function loadLib(
  updateLogList: UpdateLogListFunction
): Promise<Libraries> {
  const lib = await loadLibraries();
  const loadedLibraries = (
    <>
      Loaded{" "}
      <a
        href="https://docs.minaprotocol.com/zkapps/o1js"
        className="text-accent hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        o1js
      </a>{" "}
      library.
    </>
  );

  updateLogList({
    id: "deploy",
    itemToUpdate: "o1js",
    updatedItem: loadedLibraries,
  });
  return lib;
}
