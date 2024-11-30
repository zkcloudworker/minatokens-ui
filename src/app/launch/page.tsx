import TokenFooter from "@/components/footer/TokenFooter";
import TokenHeader from "@/components/headers/TokenHeader";
import LaunchToken from "@/components/launch/LaunchToken";
import { FC } from "react";
import { getSiteName } from "@/lib/chain";
import { isAvailable } from "@/lib/availability";
import NotAvailable from "@/components/pages/NotAvailable";

export const metadata = {
  title: `${getSiteName()} | Launchpad`,
};

const LaunchTokenPage: FC = () => {
  return (
    <>
      <TokenHeader showSearch={false} />
      <main>
        {isAvailable && <LaunchToken />}
        {!isAvailable && <NotAvailable />}
      </main>
      <TokenFooter />
    </>
  );
};

export default LaunchTokenPage;
