import TokenFooter from "@/components/footer/TokenFooter";
import TokenHeader from "@/components/headers/TokenHeader";
import TokenList from "@/components/home/TokenList";
import Hero from "@/components/home/Hero";
import Process from "@/components/home/Process";
import { getSiteName } from "@/lib/chain";
import { FC } from "react";

export const metadata = {
  title: `${getSiteName()} | Home`,
};

const HomeToken: FC = () => {
  return (
    <>
      <TokenHeader showSearch={true} />
      <main>
        <Hero />
        <TokenList title="Trending" showIcon={true} initialNumberOfItems={8} />
        <Process />
      </main>
      <TokenFooter />
    </>
  );
};

export default HomeToken;
