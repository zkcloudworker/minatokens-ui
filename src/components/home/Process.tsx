"use client";

import Image from "next/image";
import { getSiteName } from "@/lib/chain";
import { generateSubscription } from "@/lib/api/key";
import { FormEvent, useState, useEffect } from "react";
import { unavailableCountry, checkAvailability } from "@/lib/availability";

export const process = [
  {
    id: 1,
    backgroundColor: "#CDBCFF",
    iconSrc: "/img/process/process5.svg",
    alt: "process",
    title: "1. Connect your wallet",
    bgClass: "bg-accent",
    description:
      "Connect your wallet to MinaTokens by clicking the Connect button in the top right corner.",
  },
  {
    id: 2,
    backgroundColor: "#C4F2E3",
    iconSrc: "/img/process/process6.svg",
    alt: "process",
    title: "2. Launch your token",
    bgClass: "bg-green",
    description:
      "Click Launch and define your token. Add name, website links, a description and a profile image.",
  },
  {
    id: 3,
    backgroundColor: "#FFD0D0",
    iconSrc: "/img/process/process8.svg",
    alt: "process",
    title: "3. Mint and Trade your tokens",
    bgClass: "bg-red",
    description:
      "Mint your tokens and start trading them on MinaTokens with the help from Mina Developers Alliance!",
  },
];
interface ProcessItem {
  backgroundColor: string;
  bgClass: string;
  iconSrc: string;
  title: string;
  description: string;
}

const emailMessages = {
  initial: `Join our mailing list to stay in the loop with our newest feature
          releases, Airdrops, and tips and tricks for navigating ${getSiteName()}.`,
  processing: "Processing subscription request...",
  success: "Thank you for subscribing!",
  error: "An error occurred while subscribing",
};

export default function Process(): JSX.Element {
  const [emailMessage, setEmailMessage] = useState(emailMessages.initial);
  const [isAvailable, setIsAvailable] = useState<boolean>(!unavailableCountry);

  useEffect(() => {
    checkAvailability().then((result) => {
      setIsAvailable(!result);
      if (!result) window.location.href = "/not-available";
    });
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    setEmailMessage(emailMessages.processing);
    const response = await generateSubscription(email);
    if (response.status === 200) {
      console.log("Subscription sent");
      setEmailMessage(emailMessages.success);
    } else {
      console.error("Failed to send subscription", response.json?.error);
      setEmailMessage(response.json?.error ?? emailMessages.error);
    }
  };

  return (
    <>
      {isAvailable && (
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
              {process.map((elm: ProcessItem, i: number) => (
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
              {emailMessage}
            </p>

            <div className="mx-auto mt-7 max-w-md text-center">
              <form onSubmit={handleSubmit} className="relative">
                <input
                  type="email"
                  name="email"
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
      )}
    </>
  );
}
