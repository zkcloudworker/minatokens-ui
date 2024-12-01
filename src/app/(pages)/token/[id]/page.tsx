import TokenHeader from "@/components/headers/TokenHeader";
import TokenFooter from "@/components/footer/TokenFooter";
import TokenDetails from "@/components/pages/item/TokenDetails";

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
        <TokenDetails tokenAddress={params.id} />
      </main>
      <TokenFooter />
    </>
  );
}
