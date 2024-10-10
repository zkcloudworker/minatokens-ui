import Footer1 from "@/components/footer/Footer1";
import Header1 from "@/components/headers/Header1";
import ItemDetails from "@/components/pages/item/ItemDetails";

export const metadata = {
  title: "Token Details",
};

export default function TokenDetailsPage({ params }) {
  return (
    <>
      <Header1 />
      <main className="mt-24">
        <ItemDetails id={params.id} />
      </main>
      <Footer1 />
    </>
  );
}
