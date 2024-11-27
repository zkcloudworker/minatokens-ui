"use client";
import { process3 } from "@/data/process";
import Image from "next/image";
import { getSiteName } from "@/lib/chain";

export default function Process() {
  return (
    <section className="relative py-24 dark:bg-jacarta-800">
      <picture className="pointer-events-none absolute inset-0 -z-10 dark:hidden">
        <Image
          width={1920}
          height={789}
          src="/img/gradient_light.jpg"
          priority
          alt="gradient"
          className="h-full w-full"
        />
      </picture>
      <div className="container">
        <h2 className="mb-16 text-center font-display text-3xl text-jacarta-700 dark:text-white">
          Launch and sell your custom tokens
        </h2>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3">
          {process3.map((elm, i) => (
            <div key={i} className="text-center">
              <div
                className={`mb-6 inline-flex rounded-full bg-[${elm.backgroundColor}] p-3`}
              >
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${elm.bgClass}`}
                >
                  <Image
                    width={24}
                    height={24}
                    src={elm.iconSrc}
                    alt="process"
                  />
                </div>
              </div>
              <h3
                dir="ltr"
                className="mb-4  font-display text-lg text-jacarta-700 dark:text-white"
              >
                {elm.title}
              </h3>
              <p className="dark:text-jacarta-300">{elm.description}</p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-20 max-w-2xl text-center text-lg text-jacarta-700 dark:text-white">
          Join our mailing list to stay in the loop with our newest feature
          releases, Airdrops, and tips and tricks for navigating {getSiteName()}
          .
        </p>

        <div className="mx-auto mt-7 max-w-md text-center">
          <form onSubmit={(e) => e.preventDefault()} className="relative">
            <input
              type="email"
              // dir="ltr"
              placeholder="Email address"
              className="w-full rounded-full border border-jacarta-100 py-3 px-4 focus:ring-accent dark:border-jacarta-600 dark:bg-jacarta-700 dark:text-white dark:placeholder-white"
            />
            <button className="absolute top-2 right-2 rtl:left-2 rtl:right-auto rounded-full bg-accent px-6 py-2 font-display text-sm text-white hover:bg-accent-dark">
              Subscribe
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
