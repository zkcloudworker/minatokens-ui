import TokenFooter from "@/components/footer/TokenFooter";
import TokenHeader from "@/components/headers/TokenHeader";
import Ranking from "@/components/pages/api/API";
import { FC } from "react";
import { getSiteName } from "@/lib/chain";

export const metadata = {
  title: `${getSiteName()} | API`,
};

const ApiPage: FC = () => {
  return (
    <>
      <TokenHeader showSearch={false} />
      <main>
        <Ranking />
      </main>
      <TokenFooter />
    </>
  );
};

export default ApiPage;
