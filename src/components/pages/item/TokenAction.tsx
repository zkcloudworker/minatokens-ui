"use client";
import { TokenActionForm } from "@/components/token/TokenActionForm";
import {
  MintAddress,
  TokenAction,
  TokenState,
  TokenActionData,
  TokenActionTransactionParams,
} from "@/tokens/lib/token";
import { TransactionTokenState, TokenActionFormData } from "@/context/action";
import { TimeLine } from "@/components/launch/TimeLine";
import { tokenAction } from "./lib/action";
import { debug } from "@/lib/debug";
import { useTransactionStore } from "@/context/tx-provider";
import { TokenAirdropTransactionParams } from "@minatokens/api";
import { OrderbookTab } from "./Orderbook";

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

function initialTokenActionData(params: {
  tokenState: TokenState;
  tab: TokenAction;
  formData: TokenActionFormData;
}): TokenActionData {
  const { tokenState, tab, formData } = params;
  const txs: TokenActionTransactionParams[] = [];

  switch (tab) {
    case "mint":
      txs.push(
        ...formData.addresses.map(
          (address) =>
            ({
              tokenAddress: tokenState.tokenAddress,
              sender: tokenState.adminAddress,
              txType: "token:mint",
              to: address.address,
              amount: Math.round(
                (address.amount ? Number(address.amount) : 0) * 1_000_000_000
              ),
            } as TokenActionTransactionParams)
        )
      );
      break;
    case "transfer":
      txs.push(
        ...formData.addresses.map(
          (address) =>
            ({
              tokenAddress: tokenState.tokenAddress,
              sender: tokenState.adminAddress,
              txType: "token:transfer",
              to: address.address,
              amount: Math.round(
                (address.amount ? Number(address.amount) : 0) * 1_000_000_000
              ),
            } as TokenActionTransactionParams)
        )
      );
      break;
    case "airdrop":
      txs.push({
        tokenAddress: tokenState.tokenAddress,
        sender: tokenState.adminAddress,
        txType: "token:airdrop",
        recipients: formData.addresses.map((address) => ({
          address: address.address,
          amount: Math.round(
            (address.amount ? Number(address.amount) : 0) * 1_000_000_000
          ),
        })),
      } as TokenAirdropTransactionParams);
      break;
    case "offer":
      txs.push({
        tokenAddress: tokenState.tokenAddress,
        sender: tokenState.adminAddress,
        txType: "token:offer:create",
        amount: Math.round(
          formData.amount ? Number(formData.amount) * 1_000_000_000 : 0
        ),
        price: Math.round(
          formData.price
            ? Number(formData.price) * 1_000_000_000
            : 1_000_000_000
        ),
      });
      break;
    case "bid":
      txs.push({
        tokenAddress: tokenState.tokenAddress,
        sender: tokenState.adminAddress,
        txType: "token:bid:create",
        amount: Math.round(
          formData.amount ? Number(formData.amount) * 1_000_000_000 : 0
        ),
        price: Math.round(
          formData.price
            ? Number(formData.price) * 1_000_000_000
            : 1_000_000_000
        ),
      });
      break;
  }
  return {
    symbol: tokenState.tokenSymbol,
    txs,
  };
}
export type TokenActionProps = {
  tokenAddress: string;
  tokenState: TokenState | undefined;
  symbol: string;
  decimals: number;
  tab: TokenAction;
  onBalanceUpdate: () => Promise<void>;
};

export function TokenActionComponent({
  tokenAddress,
  tokenState,
  symbol,
  decimals,
  tab,
  onBalanceUpdate,
}: TokenActionProps) {
  const { transactionStates, setTokenData, setFormData } = useTransactionStore(
    (state) => state
  );

  const state: TransactionTokenState = transactionStates[tokenAddress]?.[
    tab
  ] ?? {
    tokenAddress,
    tab,
    timelineItems: [],
    isProcessing: false,
    formData: {
      addresses: initialAddresses.slice(
        0,
        tab === "mint" || tab === "airdrop" ? 2 : 1
      ),
    },
    statistics: {
      success: 0,
      error: 0,
      waiting: 0,
    },
    isErrorNow: false,
  };
  const isProcessing = state?.isProcessing || false;
  const timelineItems = state?.timelineItems || [];

  function onChange(formData: TokenActionFormData) {
    setFormData({
      tokenAddress,
      tab,
      formData,
    });
  }

  async function onSubmit(formData: TokenActionFormData) {
    if (DEBUG) console.log("Processing form", formData);
    if (!tokenState) return;
    const tokenData = initialTokenActionData({
      tokenState,
      tab,
      formData,
    });
    setTokenData({
      tokenAddress,
      tab,
      tokenData,
      timelineItems: [],
      formData,
      isProcessing: true,
      statistics: {
        success: 0,
        error: 0,
        waiting: 0,
      },
      isErrorNow: false,
    });
    tokenAction({
      tokenState,
      tokenData,
      tab,
      onBalanceUpdate,
    });
  }

  async function onSubmitOrder(tokenData: TokenActionData) {
    if (DEBUG) console.log("Processing order", tokenData);
    if (!tokenState) return;
    setTokenData({
      tokenAddress,
      tab,
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
    tokenAction({
      tokenState,
      tokenData,
      tab,
      onBalanceUpdate,
    });
  }

  return (
    <>
      {isProcessing && (
        <div className="container rounded-t-2lg rounded-b-2lg rounded-tl-none border border-jacarta-100 p-6 dark:border-jacarta-600">
          <TimeLine items={timelineItems} dark={true} />
        </div>
      )}
      {!isProcessing && tab !== "orderbook" && tab !== "withdraw" && (
        <div className="container rounded-t-2lg rounded-b-2lg rounded-tl-none border border-jacarta-100 p-6 dark:border-jacarta-600">
          <TokenActionForm
            key={"tokenAction-" + tokenAddress + "-" + tab}
            onSubmit={onSubmit}
            onChange={onChange}
            data={state.formData}
            buttonText={tab.slice(0, 1).toUpperCase() + tab.slice(1)}
            showPrice={tab === "offer" || tab === "bid"}
            showAmount={tab === "offer" || tab === "bid"}
            showAddMore={tab === "mint" || tab === "airdrop"}
            showAddress={
              tab === "transfer" || tab === "airdrop" || tab === "mint"
            }
          />
        </div>
      )}
      {!isProcessing && (tab === "orderbook" || tab === "withdraw") && (
        <div className="container rounded-t-2lg rounded-b-2lg rounded-tl-none border border-jacarta-100 p-6 dark:border-jacarta-600">
          <OrderbookTab
            tokenAddress={tokenAddress}
            tokenState={tokenState}
            symbol={symbol}
            decimals={decimals}
            tab={tab}
            key={"tokenAction-" + tokenAddress + "-" + tab}
            onSubmit={onSubmitOrder}
          />
        </div>
      )}
    </>
  );
}
