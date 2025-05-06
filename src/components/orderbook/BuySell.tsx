"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { log } from "@/lib/log";
import { explorerAccountUrl } from "@/lib/chain";
import { getChain } from "@/lib/chain";
import { Order } from "./OrderBook";
import {
  MintAddress,
  TokenAction,
  TokenState,
  TokenActionData,
  TokenActionTransactionParams,
} from "@/tokens/lib/token";
import { getOrderbook } from "@/lib/trade";
import { bidInfo, offerInfo } from "@/lib/api/info/token-info";
import {
  TokenBuyTransactionParams,
  TokenSellTransactionParams,
} from "@silvana-one/api";
import { useContext } from "react";
import { AddressContext } from "@/context/address";
import { useTransactionStore } from "@/context/tx-provider";
import { tokenAction } from "@/components/pages/item/lib/action";
import { debug } from "@/lib/debug";
import { useTokenDetails } from "@/context/details";
import { balance } from "@/lib/api/info/token-info";
const DEBUG = debug();

const chain = getChain();
function formatBalance(num: number | undefined): string {
  if (num === undefined) return "-";
  const fixed = num.toLocaleString(undefined, {
    maximumSignificantDigits: 4,
  });
  return fixed;
}

export function BuySellDialog({
  operation,
  onClose,
  onConfirm,
  offer,
  bid,
  symbol,
  tokenAddress,
  tokenState,
  decimals,
}: {
  operation: "buy" | "sell" | undefined;
  onClose: () => void;
  onConfirm: () => void;
  offer?: Order;
  bid?: Order;
  symbol: string;
  tokenAddress: string;
  tokenState: TokenState | undefined;
  decimals?: number;
}) {
  const { transactionStates, setTokenData, setFormData, setIsProcessing } =
    useTransactionStore((state) => state);
  const { address, setAddress } = useContext(AddressContext);
  const [amount, setAmount] = useState<number | undefined>(undefined);

  const order = operation === "buy" ? offer : bid;
  const price = order?.price;
  const maxAmount =
    operation === "buy" ? order?.amount : (order?.amount ?? 0) / (price ?? 1);
  const total = (price ?? 0) * (amount ?? 0);
  const exceeded = chain === "mainnet" && total > 500;

  const { state, dispatch } = useTokenDetails();
  const tokenBalance = state.tokens[tokenAddress]?.balance;
  const minaBalance = state.minaBalance;

  const setTokenBalance = (balance: number | undefined) =>
    dispatch({ type: "SET_BALANCE", payload: { tokenAddress, balance } });

  const setMinaBalance = (minaBalance: number | undefined) =>
    dispatch({ type: "SET_MINA_BALANCE", payload: { minaBalance } });

  const fetchBalance = useCallback(async () => {
    if (DEBUG) console.log("fetchBalance", address);
    if (!address) {
      setTokenBalance(undefined);
      setMinaBalance(undefined);
      return;
    }
    const minaBalancePromise = balance({
      params: { address },
      name: "info:balance",
      apiKeyAddress: "",
    });
    const tokenBalancePromise = balance({
      params: { address, tokenAddress },
      name: "info:balance",
      apiKeyAddress: "",
    });

    const minaBalance = await minaBalancePromise;
    if (minaBalance.status === 200 && minaBalance.json.balance !== null) {
      setMinaBalance((minaBalance.json.balance ?? 0) / 10 ** 9);
    } else {
      setMinaBalance(undefined);
    }

    const tokenBalance = await tokenBalancePromise;
    if (tokenBalance.status === 200 && tokenBalance.json.balance !== null) {
      setTokenBalance((tokenBalance.json.balance ?? 0) / 10 ** (decimals ?? 9));
    } else {
      setTokenBalance(undefined);
    }

    if (DEBUG) console.log("fetchBalance done", { minaBalance, tokenBalance });
  }, [address, tokenAddress]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setAmount(undefined);
    } else {
      setAmount(parseFloat(value));
    }
  };

  async function onSubmitOrder(tokenData: TokenActionData) {
    if (DEBUG) console.log("Processing order", { tokenData, tokenState });
    if (!tokenState) return;
    setTokenData({
      tokenAddress,
      tab: "orderbook",
      tokenData,
      timelineItems: [],
      formData: {
        addresses: [],
      },
      isProcessing: true,
      statistics: {
        success: 0,
        error: 0,
        waiting: 0,
      },
      isErrorNow: false,
    });
    console.log("tokenAction", tokenState, tokenData);
    tokenAction({
      tokenState,
      tokenData,
      tab: "orderbook",
      onBalanceUpdate: fetchBalance,
    });
  }

  const handleSubmit = (order: Order, amount: number) => {
    onConfirm();
    onSubmitOrder({
      symbol,
      txs: [
        {
          txType: order.type === "offer" ? "token:offer:buy" : "token:bid:sell",

          amount: amount * 10 ** (decimals ?? 9),
          tokenAddress,
          sender: tokenState?.adminAddress,
          offerAddress: order.type === "offer" ? order.address : undefined,
          bidAddress: order.type === "bid" ? order.address : undefined,
        } as TokenBuyTransactionParams | TokenSellTransactionParams,
      ],
    });
  };

  return (
    <Dialog open={operation !== undefined} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {operation === "buy" ? "Buy" : "Sell"} {symbol}
          </DialogTitle>
          {/* <DialogDescription>
            Please enter the amount of {symbol} you want to{" "}
            {operation === "buy"
              ? `buy`
              : `sell`}
            :
          </DialogDescription> */}
        </DialogHeader>
        <div className="py-4">
          <p>
            <strong className="inline-block w-40 mb-2">Price:</strong>{" "}
            {formatBalance(order?.price)} MINA/{symbol}
          </p>
          <p>
            <strong className="inline-block mb-2">Amount in {symbol}:</strong>{" "}
          </p>
          <p>
            <div className="flex gap-2">
              <Input
                type="number"
                value={amount}
                onChange={handleAmountChange}
                placeholder="Enter amount"
                className="flex-1 mb-4 rounded-lg border border-jacarta-100 bg-white py-2 px-3 text-sm dark:border-jacarta-600 dark:bg-jacarta-700 dark:text-white"
              />
              <button
                onClick={() => setAmount(maxAmount)}
                className="rounded-full border-2 h-10 border-accent py-0 px-8 text-center text-sm font-semibold text-accent transition-all hover:bg-accent hover:text-white"
              >
                MAX
              </button>
            </div>
          </p>
          <p>
            <strong className="inline-block w-32 mb-4">Total Payment:</strong>{" "}
            {formatBalance(total)} MINA
          </p>
          {tokenBalance !== undefined && (
            <p>
              <span className="text-sm inline-block w-40">
                Your {symbol} Balance:{" "}
              </span>{" "}
              <span className="text-sm inline-block">
                {" "}
                {formatBalance(tokenBalance)} {symbol}
              </span>{" "}
            </p>
          )}
          {minaBalance !== undefined && (
            <p>
              <span className="text-sm inline-block w-40">
                Your MINA Balance:{" "}
              </span>{" "}
              <span className="text-sm inline-block">
                {" "}
                {formatBalance(minaBalance)} MINA
              </span>{" "}
            </p>
          )}
          {exceeded && (
            <p className="text-red mt-4 mb-4">
              Maximum order size is 500 MINA during mainnet beta stage.
            </p>
          )}
        </div>

        <DialogFooter>
          <button
            onClick={onClose}
            className="rounded-full border-2 border-accent py-2 px-8 text-center text-sm font-semibold text-accent transition-all hover:bg-accent hover:text-white"
          >
            Cancel
          </button>

          <button
            disabled={!amount || !order || !tokenState}
            onClick={() => {
              if (amount && order && tokenState) {
                handleSubmit(order, amount);
              }
            }}
            className={`rounded-full border-2 border-accent py-2 px-8 text-center text-sm font-semibold ${
              !amount
                ? "opacity-50 cursor-not-allowed"
                : "text-accent transition-all hover:bg-accent hover:text-white"
            }`}
          >
            {operation === "buy" ? `Buy ${symbol}` : `Sell ${symbol}`}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
