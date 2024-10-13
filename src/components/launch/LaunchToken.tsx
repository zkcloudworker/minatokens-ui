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
import { exampleItems } from "./TimeLineExample";
import { TimelineDatedItem, logItem, updateLogItem } from "./TimeLine";
const DEBUG = process.env.NEXT_PUBLIC_DEBUG === "true";

const LaunchToken: React.FC = () => {
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [timelineItems, setTimelineItems] = useState<TimelineDatedItem[]>([]);

  const handleLaunchButtonClick = async (data: LaunchTokenData) => {
    if (DEBUG) console.log("Launching token:", data);

    setIsLaunching(true);
    window.scrollTo({ top: 0, behavior: "instant" });
    for (let i = 0; i < exampleItems.length; i++) {
      setTimelineItems((items) => logItem({ item: exampleItems[i], items }));
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    for (let i = 0; i < exampleItems.length; i++) {
      if (exampleItems[i].status === "waiting")
        setTimelineItems((items) =>
          updateLogItem({
            id: exampleItems[i].id,
            update: { status: "success" },
            items,
          })
        );
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  };

  return (
    <>
      {isLaunching && (
        <TokenProgress
          caption="Launching Token"
          items={timelineItems}
          tokenAddress="0x1234567890abcdef"
          image="token.png"
          likes={10}
          name="Example Token"
          symbol="EXT"
          totalSupply={10000}
          isLiked={true}
        />
      )}
      {!isLaunching && <LaunchForm onLaunch={handleLaunchButtonClick} />}
    </>
  );
};

export default LaunchToken;
