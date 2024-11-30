import TokenHeader from "@/components/headers/TokenHeader";
import TokenFooter from "@/components/footer/TokenFooter";
import TokenDetails from "@/components/pages/item/TokenDetails";
import { isAvailable } from "@/lib/availability";
import NotAvailable from "@/components/pages/NotAvailable";

export const metadata = {
  title: "Token Details",
};

interface TokenDetailsPageProps {
  params: {
    id: string;
  };
}

export default function TokenDetailsPage({ params }: TokenDetailsPageProps) {
  return (
    <>
      <TokenHeader showSearch={false} />
      <main className="mt-24">
        {isAvailable && <TokenDetails tokenAddress={params.id} />}
        {!isAvailable && <NotAvailable />}
      </main>
      <TokenFooter />
    </>
  );
}
