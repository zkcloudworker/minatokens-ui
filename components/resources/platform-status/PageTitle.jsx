export default function PageTitle() {
  return (
    <section
      className="relative bg-cover bg-center bg-no-repeat py-24 after:absolute after:inset-0 after:bg-jacarta-900/60 md:py-32"
      style={{
        backgroundImage: "url(/img/page-title/knowledge_base_banner.jpg)",
      }}
    >
      <div className="container relative z-10">
        <h1 className="text-center font-display text-4xl font-medium text-white">
          Xhibiter System Status
        </h1>
      </div>
    </section>
  );
}
