import Footer1 from "@/components/footer/Footer1";
import Header1 from "@/components/headers/Header1";
import NotFound from "@/components/pages/404";

export const metadata = {
  title: "Not Found || Xhibiter | NFT Marketplace Nextjs Template",
};
export default function NotFoundPage() {
  return (
    <>
      <Header1 />
      <main className="pt-[5.5rem] lg:pt-24">
        <NotFound />
      </main>
      <Footer1 />
    </>
  );
}
