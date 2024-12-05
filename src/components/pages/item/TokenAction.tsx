"use client";
import { TokenActionForm } from "@/components/token/TokenActionForm";
import { useStore } from "zustand";
import {
  MintAddress,
  TokenAction,
  TokenState,
  TokenActionData,
  TokenActionTransactionParams,
} from "@/lib/token";
import { TransactionTokenState, TokenActionFormData } from "@/context/action";
import { TimeLine } from "@/components/launch/TimeLine";
import { tokenAction } from "./lib/action";
import { debug } from "@/lib/debug";
import { useTransactionStore } from "@/context/tx-provider";
import { AirdropTransactionParams } from "@minatokens/api";
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

export type TokenActionProps = {
  tokenAddress: string;
  tokenState: TokenState;
  tab: TokenAction;
};

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
              txType: "mint",
              to: address.address,
              amount:
                (address.amount ? Number(address.amount) : 0) * 1_000_000_000,
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
              txType: "transfer",
              to: address.address,
              amount:
                (address.amount ? Number(address.amount) : 0) * 1_000_000_000,
            } as TokenActionTransactionParams)
        )
      );
      break;
    case "airdrop":
      txs.push({
        tokenAddress: tokenState.tokenAddress,
        sender: tokenState.adminAddress,
        txType: "airdrop",
        recipients: formData.addresses.map((address) => ({
          address: address.address,
          amount: (address.amount ? Number(address.amount) : 0) * 1_000_000_000,
        })),
      } as AirdropTransactionParams);
      break;
  }
  return {
    symbol: tokenState.tokenSymbol,
    txs,
  };
}

export function TokenActionComponent({
  tokenAddress,
  tokenState,
  tab,
}: TokenActionProps) {
  const { transactionStates, setTokenData, setFormData } = useTransactionStore(
    (state) => state
  );

  console.log(
    "TokenActionComponent transactionStates",
    transactionStates[tokenAddress]?.[tab]
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
    if (DEBUG) console.log("onChange", { tokenAddress, tab, formData });
    setFormData({
      tokenAddress,
      tab,
      formData,
    });
  }

  async function onSubmit(formData: TokenActionFormData) {
    if (DEBUG) console.log("Processing", formData);
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
    });
  }

  return (
    <>
      {isProcessing && (
        <div className="container rounded-t-2lg rounded-b-2lg rounded-tl-none border border-jacarta-100 p-6 dark:border-jacarta-600">
          <TimeLine items={timelineItems} dark={true} />
        </div>
      )}
      {!isProcessing && (
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
    </>
  );
}
