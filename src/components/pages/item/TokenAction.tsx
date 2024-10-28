import { Addresses } from "@/components/token/Addresses";
import { MintAddress, TokenState, TokenAction } from "@/lib/token";
import {
  TimeLine,
  TimelineGroup,
  TimeLineItem,
  TimelineItemStatus,
} from "@/components/launch/TimeLine";
import { useTokenAction } from "@/context/tokenAction";
import { useEffect } from "react";
import {
  tokenAction,
  getActionStatistics,
  setActionStatistics,
} from "./lib/action";
import { debug } from "@/lib/debug";
const DEBUG = debug();

const MINT_TEST = process.env.NEXT_PUBLIC_MINT_TEST === "true";
const initialAddresses: MintAddress[] = MINT_TEST
  ? [
      {
        amount: 1000,
        address: "B62qobAYQBkpC8wVnRzydrtCgWdkYTqsfXTcaLdGq1imtqtKgAHN29K",
      },
      {
        amount: 2000,
        address: "B62qiq7iTTP7Z2KEpQ9eF9UVGLiEKAjBpz1yxyd2MwMrxVwpAMLta2h",
      },
    ]
  : [
      {
        amount: "",
        address: "",
      },
    ];

let isErrorNow = false;
export function isError(): boolean {
  if (DEBUG) console.log("isErrorNow called", isErrorNow);
  return isErrorNow;
}

export type TokenActionProps = {
  tokenAddress: string;
  tokenState: TokenState;
  action: TokenAction;
};

export function TokenActionComponent({
  tokenAddress,
  tokenState,
  action,
}: TokenActionProps) {
  const { state, dispatch } = useTokenAction();

  // Use the full action path to get addresses
  const addresses =
    state[tokenAddress]?.[action]?.addresses || initialAddresses;
  const isProcessing = state[tokenAddress]?.[action]?.isProcessing || false;
  const timelineItems = state[tokenAddress]?.[action]?.timelineItems || [];

  function onChange(addresses: MintAddress[]) {
    if (DEBUG) console.log("onChange", { tokenAddress, action, addresses });
    // Ensure we're explicitly setting addresses for this specific action
    dispatch({
      type: "SET_ADDRESSES",
      payload: {
        tokenAddress,
        action, // This ensures we're saving to the correct action path
        addresses,
      },
    });
  }

  useEffect(() => {
    if (DEBUG) console.log("state", state);
    const timelineItems = state[tokenAddress]?.[action]?.timelineItems || [];
    isErrorNow = timelineItems.some((item) => item.status === "error");
    if (DEBUG) console.log("isErrorNow", isErrorNow);
    const mintItems = timelineItems.filter((item) =>
      item.groupId.startsWith("minting")
    );
    if (DEBUG) console.log("mintItems", mintItems);
    const newStatistics = {
      success: 0,
      error: 0,
      waiting: 0,
    };
    mintItems.forEach((item) => {
      if (item.status === "success") {
        newStatistics.success++;
      } else if (item.status === "error") {
        newStatistics.error++;
      } else if (item.status === "waiting") {
        newStatistics.waiting++;
      }
    });

    setActionStatistics({
      tokenAddress,
      action,
      statistics: newStatistics,
    });
    if (DEBUG) console.log("Updated statistics:", newStatistics);
  }, [state]);

  function addLog(group: TimelineGroup) {
    dispatch({
      type: "ADD_TIMELINE_GROUP",
      payload: { tokenAddress, action, group },
    });
  }

  function updateTimelineItem(params: {
    groupId: string;
    update: TimeLineItem;
  }) {
    const { groupId, update } = params;
    dispatch({
      type: "UPDATE_TIMELINE_ITEM",
      payload: { tokenAddress, action, groupId, update },
    });
  }

  async function onSubmit(mintAddresses: MintAddress[]) {
    console.log("Minting", mintAddresses);
    isErrorNow = false;
    dispatch({
      type: "SET_IS_PROCESSING",
      payload: { tokenAddress, action, isProcessing: true },
    });
    await tokenAction({
      tokenState,
      mintAddresses,
      addLog,
      updateTimelineItem,
      isError,
      action,
    });
  }

  return (
    <>
      {isProcessing && <TimeLine items={timelineItems} />}
      {!isProcessing && (
        <Addresses
          key={"tokenAction-" + tokenAddress + "-" + action}
          onSubmit={onSubmit}
          onChange={onChange}
          addresses={addresses}
          buttonText={action === "mint" ? "Mint" : "Transfer"}
        />
      )}
    </>
  );
}
