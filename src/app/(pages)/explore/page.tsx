import TokenFooter from "@/components/footer/TokenFooter";
import TokenHeader from "@/components/headers/TokenHeader";
import TokenList from "@/components/homes/common/TokenList";
import { FC } from "react";

export const metadata = {
  title: "Minatokens | Launchpad",
};

const ExploreTokens: FC = () => {
  return (
    <>
      <TokenHeader />
      <main>
        <TokenList title="Explore" showIcon={false} numberOfItems={100} />
      </main>
      <TokenFooter />
    </>
  );
};

export default ExploreTokens;
