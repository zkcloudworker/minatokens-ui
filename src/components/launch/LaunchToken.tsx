/* eslint-disable react/no-unescaped-entities */
"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState, useContext } from "react";
import { AddressContext } from "@/context/address";
import { TokenProgress } from "./TokenProgress";
import { LaunchForm } from "./LaunchForm";
import { getWalletInfo, connectWallet } from "@/lib/wallet";
import { getTokenState } from "@/lib/state";
import { exampleItems } from "./TimeLineExample";
import { TimelineDatedItem, logItem, updateLogItem } from "./TimeLine";
const DEBUG = process.env.NEXT_PUBLIC_DEBUG === "true";

const LaunchToken: React.FC = () => {
  const [image, setImage] = useState<File | undefined>(undefined);
  const [name, setName] = useState<string | undefined>(undefined);
  const [symbol, setSymbol] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState<string | undefined>(undefined);
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [timelineItems, setTimelineItems] = useState<TimelineDatedItem[]>([]);
  const { address, setAddress } = useContext(AddressContext);

  const handleLaunchButtonClick = async () => {
    if (DEBUG)
      console.log(
        "Launching token with name:",
        name,
        "symbol:",
        symbol,
        "description:",
        description
      );

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
      await new Promise((resolve) => setTimeout(resolve, 5000));
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
      {!isLaunching && <LaunchForm />}
    </>
  );
};

export default LaunchToken;
