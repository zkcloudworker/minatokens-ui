import Image from "next/image";

export default function Hero() {
  return (
    <section className="hero relative py-20">
      <picture className="pointer-events-none absolute inset-x-0 top-0 -z-10 dark:hidden">
        <Image
          width={1920}
          height={900}
          src="/img/gradient.jpg"
          alt="gradient"
          className="w-full"
        />
      </picture>
      <picture className="pointer-events-none absolute inset-x-0 top-0 -z-10 hidden dark:block">
        <Image
          width={1920}
          height={900}
          src="/img/gradient_dark.jpg"
          alt="gradient dark"
          className="w-full"
        />
      </picture>

      <div className="container">
        <div className="mx-auto max-w-4xl pt-24 text-center">
          <h1 className="font-display text-5xl text-jacarta-700 dark:text-white lg:text-6xl xl:text-7xl">
            The Best NFT Aggregator
            <span className="animate-gradient">
              More Listings. Better Prices.
            </span>
          </h1>
        </div>
      </div>
    </section>
  );
}
