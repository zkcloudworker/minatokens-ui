import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative h-screen">
      <picture className="pointer-events-none absolute inset-0 -z-10">
        <Image
          width={1920}
          height={900}
          src="/img/gradient_dark.jpg"
          alt="gradient dark"
          className="h-full w-full"
        />
      </picture>
      <picture className="pointer-events-none absolute inset-y-0 right-6 -z-10 hidden items-center justify-end md:flex xl:right-[10%]">
        <Image
          width={1920}
          height={900}
          src="/img/ico-landing/ico_landing_hero.png"
          alt="image"
          className="w-3/4 xl:w-auto"
        />
      </picture>

      <div className="ml-auto mr-auto h-full max-w-[91rem] px-4">
        <div className="grid h-full items-center gap-4 md:grid-cols-12">
          <div className="col-span-6 flex h-full flex-col items-center justify-center py-10 md:items-start lg:py-20">
            <p className="mb-5 inline-block bg-gradient-to-r from-[#F43771] to-[#FF9567] bg-clip-text text-lg text-transparent">
              Decentralized Application
            </p>
            <h1 className="mb-8 text-center font-display text-5xl text-white md:text-left lg:text-6xl">
              World’s First Decentralized Marketplace With Blockchain
            </h1>
            <div className="flex space-x-4">
              <Link
                href="/collections"
                className="rounded-full bg-accent py-3 px-8 text-center font-semibold text-white shadow-accent-volume transition-all hover:bg-accent-dark"
              >
                Get Started
              </Link>
              <Link
                href="/tos"
                className="rounded-full bg-white py-3 px-8 text-center font-semibold text-accent shadow-white-volume transition-all hover:bg-accent-dark hover:text-white hover:shadow-accent-volume"
              >
                White Paper
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
