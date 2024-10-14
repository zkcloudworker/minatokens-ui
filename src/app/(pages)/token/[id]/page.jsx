import TokenHeader from "@/components/headers/TokenHeader";
import TokenFooter from "@/components/footer/TokenFooter";
import TokenDetails from "@/components/pages/item/TokenDetails";

export const metadata = {
  title: "Token Details",
};

export default function TokenDetailsPage({ params }) {
  return (
    <>
      <TokenHeader />
      <main className="mt-24">
        <TokenDetails tokenAddress={params.id} />
      </main>
      <TokenFooter />
    </>
  );
}
