import TokenFooter from "@/components/footer/TokenFooter";
//import TokenHeader from "@/components/headers/TokenHeader";
import TokenList from "@/components/home/TokenList";
import Hero from "@/components/home/Hero";
import Process from "@/components/home/Process";
// import { getSiteName } from "@/lib/chain";
import { FC } from "react";
import { getSiteType } from "@/lib/chain";

const siteType = getSiteType();

// export const metadata = {
//   title: `${getSiteName()} | Launchpad`,
// };

const HomeToken: FC = () => {
  return (
    <>
      {/* <TokenHeader showSearch={true} /> */}
      <main className="mt-36">
        {/* <Hero /> */}
        <TokenList
          title={"Trending"}
          showIcon={true}
          initialNumberOfItems={4}
          key="home-list"
        />
        <Process />
      </main>
      <TokenFooter />
    </>
  );
};

export default HomeToken;
