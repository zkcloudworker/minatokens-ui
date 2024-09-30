import Footer1 from "@/components/footer/Footer1";
import Header1 from "@/components/headers/Header1";
import Partners from "@/components/common/Partners2";

import Intro from "@/components/pages/about/Intro";
import PageTitle from "@/components/pages/about/PageTitle";
import Story from "@/components/pages/about/Story";
import Team from "@/components/pages/about/Team";

import Blogs from "@/components/pages/about/Blogs";

export const metadata = {
  title: "About || Xhibiter | NFT Marketplace Nextjs Template",
};

export default function AboutPage() {
  return (
    <>
      <Header1 />
      <main>
        <PageTitle />
        <Intro />
        <Story />
        <Team />
        <Partners />
        <Blogs />
      </main>
      <Footer1 />
    </>
  );
}
