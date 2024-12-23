import TokenFooter from "@/components/footer/TokenFooter";
//import TokenHeader from "@/components/headers/TokenHeader";
import TokenList from "@/components/home/TokenList";
import Hero from "@/components/home/Hero";
import Process from "@/components/home/Process";
// import { getSiteName } from "@/lib/chain";
import { FC } from "react";

// export const metadata = {
//   title: `${getSiteName()} | Launchpad`,
// };

const HomeToken: FC = () => {
  return (
    <>
      {/* <TokenHeader showSearch={true} /> */}
      <main>
        <Hero />
        <TokenList
          title="Trending"
          showIcon={true}
          initialNumberOfItems={8}
          key="home-list"
        />
        <Process />
      </main>
      <TokenFooter />
    </>
  );
};

export default HomeToken;
