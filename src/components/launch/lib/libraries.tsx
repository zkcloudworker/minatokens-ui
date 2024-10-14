import { UpdateTimelineItemFunction } from "./messages";
import { loadLibraries, Libraries } from "@/lib/libraries";

export async function loadLib(
  updateTimelineItem: UpdateTimelineItemFunction
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

  updateTimelineItem({
    groupId: "deploy",
    update: {
      lineId: "o1js",
      content: loadedLibraries,
      status: "success",
    },
  });
  return lib;
}
