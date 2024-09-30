import Footer1 from "@/components/footer/Footer1";
import Header1 from "@/components/headers/Header1";
import Categories from "@/components/homes/common/Categories";
import Featured from "@/components/homes/common/Featured";
import Collections from "@/components/homes/common/Collections2";
import Cta from "@/components/homes/common/Cta";
import Hero from "@/components/homes/home-5/Hero";
import Process from "@/components/homes/home-5/Process";

export const metadata = {
  title: "Home 5 || Xhibiter | NFT Marketplace Nextjs Template",
};
export default function HomePage5() {
  return (
    <>
      <Header1 />
      <main>
        <Hero />
        <Process />
        <Featured />
        <Collections />
        <Categories />
        <Cta />
      </main>
      <Footer1 />
    </>
  );
}
