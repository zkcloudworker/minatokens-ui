"use client";
import TokenFooter from "@/components/footer/TokenFooter";
import TokenHeader from "@/components/headers/TokenHeader";
import TokenList from "@/components/home/TokenList";
import Hero from "@/components/home/Hero";
import Process from "@/components/home/Process";
import { isAvailable } from "@/lib/availability";
import NotAvailable from "@/components/pages/NotAvailable";
import { FC } from "react";

const HomeToken: FC = () => {
  return (
    <>
      <TokenHeader showSearch={true} />
      <main>
        {isAvailable && (
          <>
            <Hero />
            <TokenList
              title="Trending"
              showIcon={true}
              initialNumberOfItems={8}
            />
            <Process />
          </>
        )}
        {!isAvailable && <NotAvailable />}
      </main>
      <TokenFooter />
    </>
  );
};

export default HomeToken;
