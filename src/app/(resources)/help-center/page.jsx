import TokenHeader from "@/components/headers/TokenHeader";
import TokenFooter from "@/components/footer/TokenFooter";
import HelpCenter from "@/components/resources/help-center/HelpCenter";
import PageTitle from "@/components/resources/help-center/PageTitle";

export const metadata = {
  title: "Help Center || Xhibiter | NFT Marketplace Nextjs Template",
};

export default function HelpCenterPage() {
  return (
    <>
      <TokenHeader />
      <main className="pt-[5.5rem] lg:pt-24">
        <PageTitle />
        <HelpCenter />
      </main>
      <TokenFooter />
    </>
  );
}
