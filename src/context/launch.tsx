"use client";

import React, { createContext, useReducer, useContext, ReactNode } from "react";
import {
  TimelineDatedItem,
  TimelineItem,
  updateLogItem,
  logItem,
  deleteLogItem,
  updateLogItemDetails,
  LogListItem,
  TimelineStatus,
} from "@/components/launch/TimeLine";
import { LaunchTokenData } from "@/lib/token";

interface LaunchTokenState {
  timelineItems: TimelineDatedItem[];
  tokenData: LaunchTokenData | null;
  totalSupply: number;
  tokenAddress: string;
  likes: number;
}

type Action =
  | { type: "SET_TOKEN_DATA"; payload: LaunchTokenData }
  | { type: "SET_TIMELINE_ITEMS"; payload: TimelineDatedItem[] }
  | { type: "ADD_TIMELINE_ITEM"; payload: TimelineItem }
  | {
      type: "UPDATE_TIMELINE_ITEM";
      payload: { id: string; update: Partial<TimelineItem> };
    }
  | {
      type: "UPDATE_TIMELINE_ITEM_DETAIL";
      payload: {
        id: string;
        detailId: string;
        update: ReactNode;
        status?: TimelineStatus;
      };
    }
  | { type: "DELETE_TIMELINE_ITEM"; payload: string }
  | { type: "SET_TOTAL_SUPPLY"; payload: number }
  | { type: "SET_TOKEN_ADDRESS"; payload: string }
  | { type: "SET_LIKES"; payload: number };

const initialState: LaunchTokenState = {
  tokenData: null,
  timelineItems: [],
  totalSupply: 0,
  tokenAddress: "launching",
  likes: 0,
};

const LaunchTokenContext = createContext<{
  state: LaunchTokenState;
  dispatch: React.Dispatch<Action>;
}>({
  state: initialState,
  dispatch: () => {
    console.error("Error: Dispatch called but no provider found");
    return null;
  },
});

const launchTokenReducer = (
  state: LaunchTokenState,
  action: Action
): LaunchTokenState => {
  console.log("LaunchTokenReducer:", { state, action });
  switch (action.type) {
    case "SET_TOKEN_DATA":
      return { ...state, tokenData: action.payload };
    case "SET_TIMELINE_ITEMS":
      return { ...state, timelineItems: action.payload };
    case "ADD_TIMELINE_ITEM":
      return {
        ...state,
        timelineItems: logItem({
          item: action.payload,
          items: state.timelineItems,
        }),
      };
    case "UPDATE_TIMELINE_ITEM":
      return {
        ...state,
        timelineItems: updateLogItem({
          id: action.payload.id,
          update: action.payload.update,
          items: state.timelineItems,
        }),
      };
    case "UPDATE_TIMELINE_ITEM_DETAIL":
      return {
        ...state,
        timelineItems: updateLogItemDetails({
          items: state.timelineItems,
          id: action.payload.id,
          detailId: action.payload.detailId,
          update: action.payload.update,
          status: action.payload.status,
        }),
      };
    case "DELETE_TIMELINE_ITEM":
      return {
        ...state,
        timelineItems: deleteLogItem({
          id: action.payload,
          items: state.timelineItems,
        }),
      };
    case "SET_TOTAL_SUPPLY":
      return { ...state, totalSupply: action.payload };
    case "SET_TOKEN_ADDRESS":
      return { ...state, tokenAddress: action.payload };
    case "SET_LIKES":
      return { ...state, likes: action.payload };
    default:
      return state;
  }
};

export const LaunchTokenProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(launchTokenReducer, initialState);

  return (
    <LaunchTokenContext.Provider value={{ state, dispatch }}>
      {children}
    </LaunchTokenContext.Provider>
  );
};

export const useLaunchToken = () => useContext(LaunchTokenContext);
