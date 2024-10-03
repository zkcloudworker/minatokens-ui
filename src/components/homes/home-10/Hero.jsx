import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative py-20 lg:pt-48">
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
        <div className="h-full items-center gap-4 lg:grid lg:grid-cols-12">
          <div className="flex h-full flex-col items-center justify-center py-10 lg:col-span-5 lg:items-start lg:py-20">
            <div className="mb-8 flex items-center space-x-3 rounded-3xl border border-jacarta-200 px-5 py-2 dark:border-jacarta-300">
              <Image
                src="/img/crypto-app/rocket_crypto_app.png"
                alt="image"
                width="20"
                height="20"
              />
              <span className="text-xs font-bold uppercase tracking-wide text-jacarta-500 dark:text-jacarta-100">
                #1 CRYPTO APP IN STORES
              </span>
            </div>
            <h1 className="mb-6 text-center font-display text-5xl text-jacarta-700 dark:text-white lg:text-left lg:text-6xl">
              Enjoy choosing to invest in digital currencies.
            </h1>
            <p className="mb-8 max-w-md text-center text-lg dark:text-jacarta-200 lg:text-left">
              Every digital creation available through MakersPlace is an
              authentic and truly unique.
            </p>
            <a
              href="#"
              className="rounded-full bg-accent py-3 px-8 text-center font-semibold text-white shadow-accent-volume transition-all hover:bg-accent-dark"
            >
              Start Free Trial
            </a>
          </div>

          <div className="col-span-7">
            <div className="relative text-center">
              <Image
                width={344}
                height={694}
                src="/img/hero/hero_crypto_app.png"
                alt="hero"
                className="inline-block"
              />
              <div className="absolute top-0 -z-10 animate-fly">
                <Image
                  width={672}
                  height={606}
                  src="/img/crypto-app/3d_elements_crypto_app.png"
                  alt="image"
                  className="dark:hidden"
                />
                <Image
                  width={672}
                  height={602}
                  src="/img/crypto-app/3d_elements_crypto_app_dark.png"
                  alt="image"
                  className="hidden dark:block"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
