"use client";

import React, { createContext, useReducer, useContext, ReactNode } from "react";
import {
  TimelineDatedItem,
  TimelineItem,
  updateLogItem,
  logItem,
  deleteLogItem,
} from "@/components/launch/TimeLine";

interface LaunchTokenState {
  isLaunching: boolean;
  timelineItems: TimelineDatedItem[];
}

type Action =
  | { type: "SET_LAUNCHING"; payload: boolean }
  | { type: "SET_TIMELINE_ITEMS"; payload: TimelineDatedItem[] }
  | { type: "ADD_TIMELINE_ITEM"; payload: TimelineItem }
  | {
      type: "UPDATE_TIMELINE_ITEM";
      payload: { id: string; update: Partial<TimelineItem> };
    }
  | { type: "DELETE_TIMELINE_ITEM"; payload: string };

const initialState: LaunchTokenState = {
  isLaunching: false,
  timelineItems: [],
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
    case "SET_LAUNCHING":
      return { ...state, isLaunching: action.payload };
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
    case "DELETE_TIMELINE_ITEM":
      return {
        ...state,
        timelineItems: deleteLogItem({
          id: action.payload,
          items: state.timelineItems,
        }),
      };
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
