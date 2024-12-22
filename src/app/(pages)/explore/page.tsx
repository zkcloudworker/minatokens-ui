"use client";

import TokenFooter from "@/components/footer/TokenFooter";
//import TokenHeader from "@/components/headers/TokenHeader";
import TokenList from "@/components/home/TokenList";
import { FC } from "react";
import { getSiteName } from "@/lib/chain";

// export const metadata = {
//   title: `${getSiteName()} | Explore`,
// };

const ExploreTokens: FC = () => {
  return (
    <>
      {/* <TokenHeader /> */}
      <main>
        <TokenList title="Explore" showIcon={false} />
      </main>
      <TokenFooter />
    </>
  );
};

export default ExploreTokens;
