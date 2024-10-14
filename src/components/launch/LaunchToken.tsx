/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useEffect, useState, useContext, ReactNode } from "react";

import { TokenProgress } from "./TokenProgress";
import { LaunchForm } from "./LaunchForm";
import { LaunchTokenData } from "@/lib/token";
import { launchToken } from "./lib/launch";
import { useLaunchToken } from "@/context/launch";
import { TimeLineItem, TimelineGroup, TimelineGroupStatus } from "./TimeLine";
const DEBUG = process.env.NEXT_PUBLIC_DEBUG === "true";

const LaunchToken: React.FC = () => {
  const { state, dispatch } = useLaunchToken();

  function addLog(item: TimelineGroup) {
    dispatch({
      type: "ADD_TIMELINE_GROUP",
      payload: item,
    });
  }

  function updateTimelineItem(params: {
    groupId: string;
    update: TimeLineItem;
  }) {
    const { groupId, update } = params;
    dispatch({
      type: "UPDATE_TIMELINE_ITEM",
      payload: { groupId, update },
    });
  }

  function setTotalSupply(totalSupply: number) {
    dispatch({
      type: "SET_TOTAL_SUPPLY",
      payload: totalSupply,
    });
  }

  function setTokenAddress(tokenAddress: string) {
    dispatch({
      type: "SET_TOKEN_ADDRESS",
      payload: tokenAddress,
    });
  }

  function setLikes(likes: number) {
    dispatch({
      type: "SET_LIKES",
      payload: likes,
    });
  }

  const handleLaunchButtonClick = async (data: LaunchTokenData) => {
    if (DEBUG) console.log("Launching token:", data);

    dispatch({ type: "SET_TOKEN_DATA", payload: data });
    dispatch({ type: "SET_TIMELINE_GROUPS", payload: [] });
    dispatch({ type: "SET_TOTAL_SUPPLY", payload: 0 });
    dispatch({ type: "SET_TOKEN_ADDRESS", payload: "launching" });
    dispatch({ type: "SET_LIKES", payload: 10 });

    window.scrollTo({ top: 0, behavior: "instant" });

    launchToken({
      data,
      addLog,
      updateTimelineItem,
      setTotalSupply,
      setTokenAddress,
      setLikes,
    });
  };

  return (
    <>
      {state.tokenData && (
        <TokenProgress
          caption="Launching Token"
          items={state.timelineItems}
          tokenAddress={state.tokenAddress}
          image={state.tokenData.imageURL ?? "token.png"}
          likes={state.likes}
          name={state.tokenData.name}
          symbol={state.tokenData.symbol}
          totalSupply={state.totalSupply}
          isLiked={true}
        />
      )}
      {!state.tokenData && <LaunchForm onLaunch={handleLaunchButtonClick} />}
    </>
  );
};

export default LaunchToken;
