/* eslint-disable react/no-unescaped-entities */
import { statistis } from "@/data/statictis";
import Image from "next/image";
import Link from "next/link";

export default function Statictis() {
  return (
    <section className="relative py-12 lg:py-36">
      <picture className="pointer-events-none absolute inset-0 -z-10 after:absolute after:bottom-0 after:h-1/3 after:w-full after:bg-gradient-to-t after:from-[#010107]">
        <Image
          width={1920}
          height={1586}
          src="/img/gradient_creative.jpg"
          alt="gradient"
          className="h-full w-full -scale-y-100"
        />
      </picture>
      <div className="container -mt-20 lg:pb-32">
        <h2 className="mb-12 max-w-5xl font-display text-5xl text-white lg:text-[6rem]">
          Play Your Favorite Characters. Win Big Prizes.
        </h2>
        <p className="mb-20 max-w-4xl text-3xl font-medium text-white lg:ml-36">
          We empower artists, creators, and players to build the platform they
          always envisioned, providing the means to unleash your creativity and
          earn income.
        </p>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {statistis.map((elm, i) => (
            <div key={i}>
              <div>
                <span className="text-fill-transparent inline-block bg-gradient-to-r from-[#FFE993] to-[#FFB770] bg-clip-text font-display text-5xl font-semibold">
                  {elm.value}
                </span>
              </div>
              <span className="text-lg text-white">{elm.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="container pt-32">
        <div className="items-center justify-between lg:flex">
          <div className="relative text-center lg:w-1/2">
            <Image
              width={883}
              height={883}
              src="/img/nft-game/gradient_glow_large_1.png"
              alt="image"
              loading="lazy"
              className="absolute scale-150"
            />
            <Image
              width={423}
              height={659}
              src="/img/nft-game/robot_large_1.png"
              alt="image"
              loading="lazy"
              className="relative -top-10 inline-block"
            />
            <Image
              width={740}
              height={602}
              src="/img/hero/3D_elements.png"
              alt="image"
              loading="lazy"
              className="absolute top-10 animate-fly"
            />
          </div>
          <div className="lg:w-[45%] lg:pl-16">
            <h2 className="mb-6 font-display text-2xl text-white">
              Discover. Collect. Buy Now. And play Autobattler Game
            </h2>
            <p className="mb-8 text-lg leading-normal text-jacarta-200">
              Employees are our number-one priority, so we like to take care of
              them!
            </p>
            <p className="mb-12 text-jacarta-200">
              Every digital creation available through MakersPlace is an
              authentic and truly unique digital creation, signed and issued by
              the creator — made possible by blockchain technology. Even if the
              digital creation is copied, it won't be the authentic and
              originally signed version.
            </p>
            <Link
              href="/collections"
              className="inline-block rounded-full bg-accent py-3 px-8 text-center font-semibold text-white shadow-accent-volume transition-all hover:bg-accent-dark"
            >
              Come Discover
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
