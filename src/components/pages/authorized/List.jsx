/* eslint-disable react/no-unescaped-entities */
import Image from "next/image";
import Link from "next/link";

export default function List() {
  return (
    <section className="relative py-16 md:py-24">
      <div className="container">
        <header className="mx-auto mb-16 max-w-2xl text-center">
          <div className="mb-3 inline-flex flex-wrap items-center space-x-1 text-xs">
            <span className="inline-flex flex-wrap items-center space-x-1 text-accent text-lg">
              <Link
                href="https://minadevelopersalliance.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                In cooperation with Mina Developers Alliance
              </Link>
            </span>
          </div>

          <h1 className="mb-4 font-display text-2xl text-jacarta-700 dark:text-white sm:text-5xl">
            MinaTokens Authorized Developers
          </h1>
        </header>

        <article>
          <div className="lg:flex lg:space-x-8">
            <div className="mt-12 lg:w-1/3">
              <div className="mb-7">
                <Link
                  href="https://minadevelopersalliance.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image
                    src="/img/MDA.jpg"
                    alt="Mina Developers Alliance"
                    width={300}
                    height={200}
                    className="rounded-lg"
                  />
                </Link>
              </div>
            </div>

            <div className="article-content lg:w-2/3">
              <h2 className="text-3xl">Satyam Bansal</h2>
              <p className="text-lg leading-normal">
                Satyam Bansal is an experienced software developer and
                blockchain specialist with eight years of industry experience.
                He is the founder of TileVille, an innovative on-chain strategic
                city development game built on the Mina blockchain that has
                achieved significant user engagement.
              </p>

              <h3 className="text-xl">Notable achievements and expertise:</h3>
              <ul>
                <li>
                  Winner of multiple ZK hackathons including recent top winner
                  of recent Eth global MINA price for block explorer
                </li>
                <li>Experience as a core developer for Degen Ape Academy</li>
                <li>ZK technology educator with a public teaching channel</li>
                <li>
                  Founder and lead developer of TileVille, showcasing complex
                  zkApp development
                </li>
              </ul>
              <h3 className="text-xl">Contact details:</h3>
              <p>
                Twitter:{" "}
                <Link
                  href="https://x.com/satyambnsal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  @satyambnsal
                </Link>
              </p>
              <p>
                Github:{" "}
                <Link
                  href="https://github.com/satyambnsal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  https://github.com/satyambnsal
                </Link>
              </p>
              <p>
                Telegram:{" "}
                <Link
                  href="https://t.me/satyambnsal"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @satyambnsal
                </Link>
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
