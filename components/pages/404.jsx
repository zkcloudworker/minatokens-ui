import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <section className="relative py-16 dark:bg-jacarta-800 md:py-24">
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
        <div className="mx-auto max-w-lg text-center">
          <Image
            width={336}
            height={165}
            src="/img/404.png"
            alt="image"
            className="mb-16 inline-block"
          />
          <h1 className="mb-6 font-display text-4xl text-jacarta-700 dark:text-white md:text-6xl">
            Page Not Found!
          </h1>
          <p className="mb-12 text-lg leading-normal dark:text-jacarta-300">
            Oops! The page you are looking for does not exist. It might have
            been moved or deleted.
          </p>
          <Link
            href="/"
            className="inline-block rounded-full bg-accent py-3 px-8 text-center font-semibold text-white shadow-accent-volume transition-all hover:bg-accent-dark"
          >
            Navigate Back Home
          </Link>
        </div>
      </div>
    </section>
  );
}
