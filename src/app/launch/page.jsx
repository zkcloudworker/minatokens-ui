import TokenFooter from "@/components/footer/TokenFooter";
import TokenHeader from "@/components/headers/TokenHeader";
import Create from "@/components/create/Create";

export const metadata = {
  title: "Minatokens | Launchpad",
};

export default function CreatePage() {
  return (
    <>
      <TokenHeader />
      <main>
        <Create />
      </main>
      <TokenFooter />
    </>
  );
}
