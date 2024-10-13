/* eslint-disable react/no-unescaped-entities */
"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState, useContext } from "react";
import { AddressContext } from "@/context/address";
import { MintAddressesModal, MintAddress } from "../modals/MintAddressesModal";
import { TokenProgress } from "./TokenProgress";
import { LaunchForm, TokenLinks, LaunchTokenData } from "./LaunchForm";
import { getWalletInfo, connectWallet } from "@/lib/wallet";
import { getTokenState } from "@/lib/state";
import { launchToken } from "./lib/launch";
import { useLaunchToken } from "@/context/launch";
import {
  TimelineDatedItem,
  TimelineItem,
  logItem,
  logList,
  updateLogItem,
} from "./TimeLine";
import { exampleItems } from "./TimeLineExample";
const DEBUG = process.env.NEXT_PUBLIC_DEBUG === "true";

const LaunchToken: React.FC = () => {
  const { state, dispatch } = useLaunchToken();

  function addLog(item: TimelineItem) {
    dispatch({
      type: "ADD_TIMELINE_ITEM",
      payload: item,
    });
  }

  function updateLog(id: string, update: Partial<TimelineItem>) {
    dispatch({
      type: "UPDATE_TIMELINE_ITEM",
      payload: { id, update },
    });
  }

  useEffect(() => {
    console.log("State isLaunching changed:", state.isLaunching);
  }, [state.isLaunching]);

  useEffect(() => {
    console.log(
      "Timeline items changed:",
      state.timelineItems.map((item) => item.id).join(", ")
    );
  }, [state.timelineItems]);

  const handleLaunchButtonClick = async (data: LaunchTokenData) => {
    if (DEBUG) console.log("Launching token:", data);
    console.log("Launching token:", state.isLaunching);
    dispatch({ type: "SET_LAUNCHING", payload: true });
    dispatch({ type: "SET_TIMELINE_ITEMS", payload: [] });
    window.scrollTo({ top: 0, behavior: "instant" });
    console.log("Launching token started:", state.isLaunching);

    for (const item of exampleItems) {
      console.log("Adding log:", item.id);
      addLog(item);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    //launchToken(data, addLog, updateLog);
  };

  return (
    <>
      {state.isLaunching && (
        <TokenProgress
          caption="Launching Token"
          items={state.timelineItems}
          tokenAddress="0x1234567890abcdef"
          image="token.png"
          likes={10}
          name="Example Token"
          symbol="EXT"
          totalSupply={10000}
          isLiked={true}
        />
      )}
      {!state.isLaunching && <LaunchForm onLaunch={handleLaunchButtonClick} />}
    </>
  );
};

export default LaunchToken;
