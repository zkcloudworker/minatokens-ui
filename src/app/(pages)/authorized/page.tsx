import TokenFooter from "@/components/footer/TokenFooter";
import TokenHeader from "@/components/headers/TokenHeader";
import List from "@/components/pages/authorized/List";

export const metadata = {
  title: "Authorized Developers || MinaTokens.com",
};

export default function AuthorizedPage() {
  return (
    <>
      <TokenHeader showSearch={false} />
      <main className="pt-[5.5rem] lg:pt-24">
        <List />
      </main>
      <TokenFooter />
    </>
  );
}
