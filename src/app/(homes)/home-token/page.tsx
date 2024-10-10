"use client";
import Footer1 from "@/components/footer/Footer1";
import TokenHeader from "@/components/headers/TokenHeader";
import TokenList from "@/components/homes/common/TokenList";
//import Collections from "@/components/homes/common/Collections";
import Hero from "@/components/homes/home-1/Hero";
//import Hotbids from "@/components/homes/home-1/Hotbids";
import Process from "@/components/homes/common/Process";
import { SearchProvider } from "@/context/search";
import { AddressProvider } from "@/context/address";
import { FC } from "react";

const HomeToken: FC = () => {
  return (
    <SearchProvider>
      <AddressProvider>
        <TokenHeader />
        <main>
          <Hero />

          {/* <Hotbids />
        <Collections /> */}
          <TokenList />
          <Process />
        </main>
        <Footer1 />
      </AddressProvider>
    </SearchProvider>
  );
};

export default HomeToken;
