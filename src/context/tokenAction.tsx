"use client";

import React, { createContext, useReducer, useContext, ReactNode } from "react";
import { MintAddress, TokenAction } from "@/lib/token";
import {
  TimeLineItem,
  TimelineGroup,
  TimelineGroupDated,
  addTimelineGroup,
  updateTimelineGroup,
  updateTimelineItem,
  deleteTimelineGroup,
  TimelineItemStatus,
  TimelineGroupStatus,
} from "@/components/launch/TimeLine";
import { debug } from "@/lib/debug";
import { log } from "@/lib/log";
const DEBUG = debug();

interface TokenActionState {
  addresses?: MintAddress[];
  timelineItems: TimelineGroupDated[];
  isProcessing?: boolean;
}

type TokenActionStates = {
  [tokenAddress in string]: {
    [action in TokenAction]: TokenActionState;
  };
};
type Action =
  | {
      type: "SET_ADDRESSES";
      payload: {
        tokenAddress: string;
        action: TokenAction;
        addresses: MintAddress[];
      };
    }
  | {
      type: "SET_IS_PROCESSING";
      payload: {
        tokenAddress: string;
        action: TokenAction;
        isProcessing: boolean;
      };
    }
  | {
      type: "SET_TIMELINE_GROUPS";
      payload: {
        tokenAddress: string;
        action: TokenAction;
        items: TimelineGroupDated[];
      };
    }
  | {
      type: "ADD_TIMELINE_GROUP";
      payload: {
        tokenAddress: string;
        action: TokenAction;
        group: TimelineGroup;
      };
    }
  | {
      type: "UPDATE_TIMELINE_GROUP";
      payload: {
        tokenAddress: string;
        action: TokenAction;
        groupId: string;
        update: Partial<TimelineGroup>;
      };
    }
  | {
      type: "UPDATE_TIMELINE_ITEM";
      payload: {
        tokenAddress: string;
        action: TokenAction;
        groupId: string;
        update: TimeLineItem;
      };
    }
  | {
      type: "DELETE_TIMELINE_GROUP";
      payload: { tokenAddress: string; action: TokenAction; groupId: string };
    };

const initialState: TokenActionStates = {};

const TokenActionContext = createContext<{
  state: TokenActionStates;
  dispatch: React.Dispatch<Action>;
}>({
  state: initialState,
  dispatch: () => {
    log.error(
      "Error: Dispatch TokenActionContext called but no provider found"
    );
    return null;
  },
});

const tokenActionReducer = (
  state: TokenActionStates,
  action: Action
): TokenActionStates => {
  switch (action.type) {
    case "SET_ADDRESSES": {
      const { tokenAddress, action: tokenAction, addresses } = action.payload;
      if (DEBUG) console.log("SET_ADDRESSES", action.payload);
      const result = {
        ...state,
        [tokenAddress]: {
          ...state[tokenAddress],
          [tokenAction]: {
            ...state[tokenAddress]?.[tokenAction],
            addresses,
            timelineItems:
              state[tokenAddress]?.[tokenAction]?.timelineItems || [],
          },
        },
      };
      if (DEBUG) console.log("SET_ADDRESSES result", result);
      return result;
    }
    case "SET_IS_PROCESSING": {
      const {
        tokenAddress,
        action: tokenAction,
        isProcessing,
      } = action.payload;
      return {
        ...state,
        [tokenAddress]: {
          ...state[tokenAddress],
          [tokenAction]: {
            ...state[tokenAddress]?.[tokenAction],
            isProcessing,
            timelineItems:
              state[tokenAddress]?.[tokenAction]?.timelineItems || [],
          },
        },
      };
    }
    case "SET_TIMELINE_GROUPS":
      return {
        ...state,
        [action.payload.tokenAddress]: {
          ...state[action.payload.tokenAddress],
          [action.payload.action]: {
            ...state[action.payload.tokenAddress]?.[action.payload.action],
            timelineItems: action.payload.items,
          },
        },
      };
    case "ADD_TIMELINE_GROUP":
      return {
        ...state,
        [action.payload.tokenAddress]: {
          ...state[action.payload.tokenAddress],
          [action.payload.action]: {
            ...state[action.payload.tokenAddress]?.[action.payload.action],
            timelineItems: addTimelineGroup({
              item: action.payload.group,
              items:
                state[action.payload.tokenAddress]?.[action.payload.action]
                  ?.timelineItems || [],
            }),
          },
        },
      };
    case "UPDATE_TIMELINE_GROUP":
      return {
        ...state,
        [action.payload.tokenAddress]: {
          ...state[action.payload.tokenAddress],
          [action.payload.action]: {
            ...state[action.payload.tokenAddress]?.[action.payload.action],
            timelineItems: updateTimelineGroup({
              groupId: action.payload.groupId,
              update: action.payload.update,
              items:
                state[action.payload.tokenAddress]?.[action.payload.action]
                  ?.timelineItems || [],
            }),
          },
        },
      };
    case "UPDATE_TIMELINE_ITEM":
      return {
        ...state,
        [action.payload.tokenAddress]: {
          ...state[action.payload.tokenAddress],
          [action.payload.action]: {
            ...state[action.payload.tokenAddress]?.[action.payload.action],
            timelineItems: updateTimelineItem({
              items:
                state[action.payload.tokenAddress]?.[action.payload.action]
                  ?.timelineItems || [],
              groupId: action.payload.groupId,
              update: action.payload.update,
            }),
          },
        },
      };
    case "DELETE_TIMELINE_GROUP":
      return {
        ...state,
        [action.payload.tokenAddress]: {
          ...state[action.payload.tokenAddress],
          [action.payload.action]: {
            ...state[action.payload.tokenAddress]?.[action.payload.action],
            timelineItems: deleteTimelineGroup({
              groupId: action.payload.groupId,
              items:
                state[action.payload.tokenAddress]?.[action.payload.action]
                  ?.timelineItems || [],
            }),
          },
        },
      };
    default:
      return state;
  }
};

export const TokenActionProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(tokenActionReducer, initialState);

  return (
    <TokenActionContext.Provider value={{ state, dispatch }}>
      {children}
    </TokenActionContext.Provider>
  );
};

export const useTokenAction = () => useContext(TokenActionContext);
