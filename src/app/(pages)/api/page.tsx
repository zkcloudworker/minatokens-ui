import TokenFooter from "@/components/footer/TokenFooter";
import TokenHeader from "@/components/headers/TokenHeader";
import API from "@/components/pages/api/API";
import { FC } from "react";
import { getSiteName } from "@/lib/chain";
import { isAvailable } from "@/lib/availability";
import NotAvailable from "@/components/pages/NotAvailable";

export const metadata = {
  title: `${getSiteName()} | API`,
};

const ApiPage: FC = () => {
  return (
    <>
      <TokenHeader showSearch={false} />
      <main>
        {isAvailable && <API />}
        {!isAvailable && <NotAvailable />}
      </main>
      <TokenFooter />
    </>
  );
};

export default ApiPage;
