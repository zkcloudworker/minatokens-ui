import TokenFooter from "@/components/footer/TokenFooter";
import TokenHeader from "@/components/headers/TokenHeader";
import TokenList from "@/components/home/TokenList";
import { FC } from "react";
import { getSiteName } from "@/lib/chain";
import { isAvailable } from "@/lib/availability";
import NotAvailable from "@/components/pages/NotAvailable";

export const metadata = {
  title: `${getSiteName()} | Explore`,
};

const ExploreTokens: FC = () => {
  return (
    <>
      <TokenHeader />
      <main>
        {isAvailable && <TokenList title="Explore" showIcon={false} />}
        {!isAvailable && <NotAvailable />}
      </main>
      <TokenFooter />
    </>
  );
};

export default ExploreTokens;
