"use client";

import React, { createContext, useReducer, useContext, ReactNode } from "react";
import { DeployedTokenInfo, TokenState, TokenAction } from "@/lib/token";
import { Order } from "@/components/orderbook/OrderBook";
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
  bid: Order | undefined;
  offer: Order | undefined;
  isPriceLoaded: boolean;
}

interface TokenDetailsStates {
  tokens: { [tokenAddress: string]: TokenDetailsState };
  list: DeployedTokenInfo[];
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
      type: "SET_LIKES";
      payload: { tokenAddress: string; likes: number };
    }
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
    }
  | {
      type: "SET_BID";
      payload: { tokenAddress: string; bid: Order | undefined };
    }
  | {
      type: "SET_OFFER";
      payload: { tokenAddress: string; offer: Order | undefined };
    }
  | {
      type: "SET_IS_PRICE_LOADED";
      payload: { tokenAddress: string; isPriceLoaded: boolean };
    }
  | {
      type: "SET_ITEMS";
      payload: { items: DeployedTokenInfo[] };
    };

const initialState: TokenDetailsStates = {
  tokens: {},
  list: [],
};

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
        tokens: {
          ...state.tokens,
          [action.payload.tokenAddress]: {
            ...state.tokens[action.payload.tokenAddress],
            info: action.payload.info,
          },
        },
      };
    case "SET_TOKEN_STATE":
      const index = state.list.findIndex(
        (elm) => elm.tokenAddress === action.payload.tokenAddress
      );
      return {
        ...state,
        list:
          index === -1
            ? state.list
            : [
                ...state.list.slice(0, index),
                {
                  ...state.list[index],
                  ...action.payload.tokenState,
                },
                ...state.list.slice(index + 1),
              ],
        tokens: {
          ...state.tokens,
          [action.payload.tokenAddress]: {
            ...state.tokens[action.payload.tokenAddress],
            tokenState: action.payload.tokenState,
          },
        },
      };

    case "SET_LIKE":
      return {
        ...state,
        tokens: {
          ...state.tokens,
          [action.payload.tokenAddress]: {
            ...state.tokens[action.payload.tokenAddress],
            like: action.payload.like,
          },
        },
      };
    case "SET_LIKES":
      return {
        ...state,
        list: state.list.map((token) => ({
          ...token,
          likes:
            token.tokenAddress === action.payload.tokenAddress
              ? action.payload.likes
              : token.likes,
        })),
      };

    case "ADD_LIKE": {
      const tokenDetails = state.tokens[action.payload.tokenAddress];
      if (!tokenDetails?.info) return state;

      return {
        ...state,
        tokens: {
          ...state.tokens,
          [action.payload.tokenAddress]: {
            ...tokenDetails,
            info: {
              ...tokenDetails.info,
              likes: (tokenDetails.info.likes || 0) + 1,
            },
          },
        },
      };
    }
    case "SET_HOLDERS":
      return {
        ...state,
        tokens: {
          ...state.tokens,
          [action.payload.tokenAddress]: {
            ...state.tokens[action.payload.tokenAddress],
            holders: action.payload.holders,
          },
        },
      };
    case "SET_TRANSACTIONS":
      return {
        ...state,
        tokens: {
          ...state.tokens,
          [action.payload.tokenAddress]: {
            ...state.tokens[action.payload.tokenAddress],
            transactions: action.payload.transactions,
          },
        },
      };
    case "SET_ACTION":
      return {
        ...state,
        tokens: {
          ...state.tokens,
          [action.payload.tokenAddress]: {
            ...state.tokens[action.payload.tokenAddress],
            action: action.payload.action,
          },
        },
      };
    case "SET_BID":
      return {
        ...state,
        tokens: {
          ...state.tokens,
          [action.payload.tokenAddress]: {
            ...state.tokens[action.payload.tokenAddress],
            bid: action.payload.bid,
          },
        },
      };
    case "SET_OFFER":
      return {
        ...state,
        tokens: {
          ...state.tokens,
          [action.payload.tokenAddress]: {
            ...state.tokens[action.payload.tokenAddress],
            offer: action.payload.offer,
          },
        },
      };
    case "SET_IS_PRICE_LOADED":
      return {
        ...state,
        tokens: {
          ...state.tokens,
          [action.payload.tokenAddress]: {
            ...state.tokens[action.payload.tokenAddress],
            isPriceLoaded: action.payload.isPriceLoaded,
          },
        },
      };
    case "SET_ITEMS":
      return {
        ...state,
        list: action.payload.items,
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
