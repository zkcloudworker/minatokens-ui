import TokenFooter from "@/components/footer/TokenFooter";
import TokenHeader from "@/components/headers/TokenHeader";
import LaunchToken from "@/components/launch/LaunchToken";
import { FC } from "react";

export const metadata = {
  title: "Minatokens | Launchpad",
};

const LaunchTokenPage: FC = () => {
  return (
    <>
      <TokenHeader showSearch={false} />
      <main>
        <LaunchToken />
      </main>
      <TokenFooter />
    </>
  );
};

export default LaunchTokenPage;
