"use client";

import React, { createContext, useReducer, useContext, ReactNode } from "react";
import { DeployedTokenInfo, TokenState, TokenAction } from "@/lib/token";
import {
  BlockberryTokenTransaction,
  BlockberryTokenHolder,
} from "@/lib/blockberry-tokens";
import { log } from "@/lib/log";
interface TokenDetailsState {
  info: DeployedTokenInfo | undefined;
  tokenState: TokenState | undefined;
  like: boolean | undefined;
  holders: BlockberryTokenHolder[];
  transactions: BlockberryTokenTransaction[];
  action: TokenAction | undefined;
}

interface TokenDetailsStates {
  [tokenAddress: string]: TokenDetailsState;
}
type Action =
  | {
      type: "SET_TOKEN_INFO";
      payload: { tokenAddress: string; info: DeployedTokenInfo };
    }
  | {
      type: "SET_TOKEN_STATE";
      payload: { tokenAddress: string; tokenState: TokenState };
    }
  | { type: "SET_LIKE"; payload: { tokenAddress: string; like: boolean } }
  | {
      type: "ADD_LIKE";
      payload: { tokenAddress: string };
    }
  | {
      type: "SET_HOLDERS";
      payload: { tokenAddress: string; holders: BlockberryTokenHolder[] };
    }
  | {
      type: "SET_TRANSACTIONS";
      payload: {
        tokenAddress: string;
        transactions: BlockberryTokenTransaction[];
      };
    }
  | {
      type: "SET_ACTION";
      payload: { tokenAddress: string; action: TokenAction | undefined };
    };

const initialState: TokenDetailsStates = {};

const TokenDetailsContext = createContext<{
  state: TokenDetailsStates;
  dispatch: React.Dispatch<Action>;
}>({
  state: initialState,
  dispatch: () => {
    log.error(
      "Error: Dispatch TokenDetailsContext called but no provider found"
    );
    return null;
  },
});

const tokenDetailsReducer = (
  state: TokenDetailsStates,
  action: Action
): TokenDetailsStates => {
  switch (action.type) {
    case "SET_TOKEN_INFO":
      return {
        ...state,
        [action.payload.tokenAddress]: {
          ...state[action.payload.tokenAddress],
          info: action.payload.info,
        },
      };
    case "SET_TOKEN_STATE":
      return {
        ...state,
        [action.payload.tokenAddress]: {
          ...state[action.payload.tokenAddress],
          tokenState: action.payload.tokenState,
        },
      };
    case "SET_LIKE":
      return {
        ...state,
        [action.payload.tokenAddress]: {
          ...state[action.payload.tokenAddress],
          like: action.payload.like,
        },
      };
    case "ADD_LIKE": {
      const tokenDetails = state[action.payload.tokenAddress];
      if (!tokenDetails?.info) return state;

      return {
        ...state,
        [action.payload.tokenAddress]: {
          ...tokenDetails,
          info: {
            ...tokenDetails.info,
            likes: (tokenDetails.info.likes || 0) + 1,
          },
        },
      };
    }
    case "SET_HOLDERS":
      return {
        ...state,
        [action.payload.tokenAddress]: {
          ...state[action.payload.tokenAddress],
          holders: action.payload.holders,
        },
      };
    case "SET_TRANSACTIONS":
      return {
        ...state,
        [action.payload.tokenAddress]: {
          ...state[action.payload.tokenAddress],
          transactions: action.payload.transactions,
        },
      };
    case "SET_ACTION":
      return {
        ...state,
        [action.payload.tokenAddress]: {
          ...state[action.payload.tokenAddress],
          action: action.payload.action,
        },
      };
    default:
      return state;
  }
};

export const TokenDetailsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(tokenDetailsReducer, initialState);

  return (
    <TokenDetailsContext.Provider value={{ state, dispatch }}>
      {children}
    </TokenDetailsContext.Provider>
  );
};

export const useTokenDetails = () => useContext(TokenDetailsContext);
