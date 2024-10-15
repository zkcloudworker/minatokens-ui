"use client";
import TokenFooter from "@/components/footer/TokenFooter";
import TokenHeader from "@/components/headers/TokenHeader";
import TokenList from "@/components/homes/common/TokenList";
//import Collections from "@/components/homes/common/Collections";
import Hero from "@/components/homes/home-1/Hero";
//import Hotbids from "@/components/homes/home-1/Hotbids";
import Process from "@/components/homes/common/Process";
import { FC } from "react";

const HomeToken: FC = () => {
  return (
    <>
      <TokenHeader showSearch={true} />
      <main>
        <Hero />

        {/* <Hotbids />
        <Collections /> */}
        <TokenList title="Trending" showIcon={true} numberOfItems={8} />
        <Process />
      </main>
      <TokenFooter />
    </>
  );
};

export default HomeToken;
