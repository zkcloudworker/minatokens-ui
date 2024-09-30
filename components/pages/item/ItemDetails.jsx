import Tabs from "./Tabs";
import { allItems } from "@/data/item";
import Image from "next/image";
import Link from "next/link";
import Timer from "./Timer";

export default function ItemDetails({ id }) {
  const item = allItems.filter((elm) => elm.id == id)[0] || allItems[0];
  return (
    <>
      <section className="relative pt-12 pb-24 lg:py-24">
        <picture className="pointer-events-none absolute inset-0 -z-10 dark:hidden">
          <Image
            width={1920}
            height={789}
            src="/img/gradient_light.jpg"
            alt="gradient"
            className="h-full w-full"
          />
        </picture>
        <div className="container">
          {/* Item */}
          <div className="md:flex md:flex-wrap">
            {/* Image */}
            <figure className="mb-8 md:w-2/5 md:flex-shrink-0 md:flex-grow-0 md:basis-auto lg:w-1/2">
              <Image
                width={540}
                height={670}
                src={"/img/products/item_single_large.jpg"}
                alt="item"
                className="cursor-pointer rounded-2.5xl w-[100%]"
                data-bs-toggle="modal"
                data-bs-target="#imageModal"
              />

              {/* Modal */}
              <div
                className="modal fade"
                id="imageModal"
                tabIndex="-1"
                aria-hidden="true"
              >
                <div className="modal-dialog !my-0 flex h-full items-center justify-center p-4">
                  <Image
                    width={787}
                    height={984}
                    src="/img/products/item_single_full.jpg"
                    alt="item"
                  />
                </div>

                <button
                  type="button"
                  className="btn-close absolute top-6 right-6"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    className="h-6 w-6 fill-white"
                  >
                    <path fill="none" d="M0 0h24v24H0z" />
                    <path d="M12 10.586l4.95-4.95 1.414 1.414-4.95 4.95 4.95 4.95-1.414 1.414-4.95-4.95-4.95 4.95-1.414-1.414 4.95-4.95-4.95-4.95L7.05 5.636z" />
                  </svg>
                </button>
              </div>
              {/* end modal */}
            </figure>

            {/* Details */}
            <div className="md:w-3/5 md:basis-auto md:pl-8 lg:w-1/2 lg:pl-[3.75rem]">
              {/* Collection / Likes / Actions */}
              <div className="mb-3 flex">
                {/* Collection */}
                <div className="flex items-center">
                  <Link
                    href={`/collections`}
                    className="mr-2 text-sm font-bold text-accent"
                  >
                    {"CryptoGuysNFT"}
                  </Link>
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-green dark:border-jacarta-600"
                    data-tippy-content="Verified Collection"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                      className="h-[.875rem] w-[.875rem] fill-white"
                    >
                      <path fill="none" d="M0 0h24v24H0z"></path>
                      <path d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z"></path>
                    </svg>
                  </span>
                </div>

                {/* Likes / Actions */}
                <div className="ml-auto flex space-x-2">
                  <div className="flex items-center space-x-1 rounded-xl border border-jacarta-100 bg-white py-2 px-4 dark:border-jacarta-600 dark:bg-jacarta-700">
                    <span
                      className="js-likes relative cursor-pointer before:absolute before:h-4 before:w-4 before:bg-[url('../img/heart-fill.svg')] before:bg-cover before:bg-center before:bg-no-repeat before:opacity-0"
                      data-tippy-content="Favorite"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        width="24"
                        height="24"
                        className="h-4 w-4 fill-jacarta-500 hover:fill-red dark:fill-jacarta-200 dark:hover:fill-red"
                      >
                        <path fill="none" d="M0 0H24V24H0z"></path>
                        <path d="M12.001 4.529c2.349-2.109 5.979-2.039 8.242.228 2.262 2.268 2.34 5.88.236 8.236l-8.48 8.492-8.478-8.492c-2.104-2.356-2.025-5.974.236-8.236 2.265-2.264 5.888-2.34 8.244-.228zm6.826 1.641c-1.5-1.502-3.92-1.563-5.49-.153l-1.335 1.198-1.336-1.197c-1.575-1.412-3.99-1.35-5.494.154-1.49 1.49-1.565 3.875-.192 5.451L12 18.654l7.02-7.03c1.374-1.577 1.299-3.959-.193-5.454z"></path>
                      </svg>
                    </span>
                    <span className="text-sm dark:text-jacarta-200">188</span>
                  </div>

                  {/* Actions */}
                  <div className="dropdown rounded-xl border border-jacarta-100 bg-white hover:bg-jacarta-100 dark:border-jacarta-600 dark:bg-jacarta-700 dark:hover:bg-jacarta-600">
                    <a
                      href="#"
                      className="dropdown-toggle inline-flex h-10 w-10 items-center justify-center text-sm"
                      role="button"
                      id="collectionActions"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      <svg
                        width="16"
                        height="4"
                        viewBox="0 0 16 4"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="fill-jacarta-500 dark:fill-jacarta-200"
                      >
                        <circle cx="2" cy="2" r="2"></circle>
                        <circle cx="8" cy="2" r="2"></circle>
                        <circle cx="14" cy="2" r="2"></circle>
                      </svg>
                    </a>
                    <div
                      className="dropdown-menu dropdown-menu-end z-10 hidden min-w-[200px] whitespace-nowrap rounded-xl bg-white py-4 px-2 text-left shadow-xl dark:bg-jacarta-800"
                      aria-labelledby="collectionActions"
                    >
                      <button className="block w-full rounded-xl px-5 py-2 text-left font-display text-sm transition-colors hover:bg-jacarta-50 dark:text-white dark:hover:bg-jacarta-600">
                        New bid
                      </button>
                      <hr className="my-2 mx-4 h-px border-0 bg-jacarta-100 dark:bg-jacarta-600" />
                      <button className="block w-full rounded-xl px-5 py-2 text-left font-display text-sm transition-colors hover:bg-jacarta-50 dark:text-white dark:hover:bg-jacarta-600">
                        Refresh Metadata
                      </button>
                      <button className="block w-full rounded-xl px-5 py-2 text-left font-display text-sm transition-colors hover:bg-jacarta-50 dark:text-white dark:hover:bg-jacarta-600">
                        Share
                      </button>
                      <button className="block w-full rounded-xl px-5 py-2 text-left font-display text-sm transition-colors hover:bg-jacarta-50 dark:text-white dark:hover:bg-jacarta-600">
                        Report
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <h1 className="mb-4 font-display text-4xl font-semibold text-jacarta-700 dark:text-white">
                {item.title ? item.title : "CryptoGuysNFT"}
              </h1>

              <div className="mb-8 flex items-center space-x-4 whitespace-nowrap">
                <div className="flex items-center">
                  <span className="-ml-1" data-tippy-content="ETH">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      x="0"
                      y="0"
                      viewBox="0 0 1920 1920"
                      // xml:space="preserve"
                      className="mr-1 h-4 w-4"
                    >
                      <path
                        fill="#8A92B2"
                        d="M959.8 80.7L420.1 976.3 959.8 731z"
                      ></path>
                      <path
                        fill="#62688F"
                        d="M959.8 731L420.1 976.3l539.7 319.1zm539.8 245.3L959.8 80.7V731z"
                      ></path>
                      <path
                        fill="#454A75"
                        d="M959.8 1295.4l539.8-319.1L959.8 731z"
                      ></path>
                      <path
                        fill="#8A92B2"
                        d="M420.1 1078.7l539.7 760.6v-441.7z"
                      ></path>
                      <path
                        fill="#62688F"
                        d="M959.8 1397.6v441.7l540.1-760.6z"
                      ></path>
                    </svg>
                  </span>
                  <span className="text-sm font-medium tracking-tight text-green">
                    4.7 ETH
                  </span>
                </div>
                <span className="text-sm text-jacarta-400 dark:text-jacarta-300">
                  Highest bid
                </span>
                <span className="text-sm text-jacarta-400 dark:text-jacarta-300">
                  1/1 available
                </span>
              </div>

              <p className="mb-10 dark:text-jacarta-300">
                Neque aut veniam consectetur magnam libero, natus eius numquam
                reprehenderit hic at, excepturi repudiandae magni optio odio
                doloribus? Facilisi lobortisal morbi fringilla urna amet sed
                ipsum.
              </p>

              {/* Creator / Owner */}
              <div className="mb-8 flex flex-wrap">
                <div className="mr-8 mb-4 flex">
                  <figure className="mr-4 shrink-0">
                    <Link href={`/user/1`} className="relative block">
                      <Image
                        width={48}
                        height={48}
                        src="/img/avatars/avatar_7.jpg"
                        alt="avatar 7"
                        className="rounded-2lg"
                        loading="lazy"
                      />
                      <div
                        className="absolute -right-3 top-[60%] flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-green dark:border-jacarta-600"
                        data-tippy-content="Verified Collection"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          width="24"
                          height="24"
                          className="h-[.875rem] w-[.875rem] fill-white"
                        >
                          <path fill="none" d="M0 0h24v24H0z"></path>
                          <path d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z"></path>
                        </svg>
                      </div>
                    </Link>
                  </figure>
                  <div className="flex flex-col justify-center">
                    <span className="block text-sm text-jacarta-400 dark:text-white">
                      Creator <strong>10% royalties</strong>
                    </span>
                    <Link href={`/user/2`} className="block text-accent">
                      <span className="text-sm font-bold">@creative_world</span>
                    </Link>
                  </div>
                </div>

                <div className="mb-4 flex">
                  <figure className="mr-4 shrink-0">
                    <Link href={`/user/4`} className="relative block">
                      <Image
                        width={48}
                        height={48}
                        src="/img/avatars/avatar_1.jpg"
                        alt="avatar 1"
                        className="rounded-2lg"
                        loading="lazy"
                      />
                      <div
                        className="absolute -right-3 top-[60%] flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-green dark:border-jacarta-600"
                        data-tippy-content="Verified Collection"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          width="24"
                          height="24"
                          className="h-[.875rem] w-[.875rem] fill-white"
                        >
                          <path fill="none" d="M0 0h24v24H0z"></path>
                          <path d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z"></path>
                        </svg>
                      </div>
                    </Link>
                  </figure>
                  <div className="flex flex-col justify-center">
                    <span className="block text-sm text-jacarta-400 dark:text-white">
                      Owned by
                    </span>
                    <Link href={`/user/6`} className="block text-accent">
                      <span className="text-sm font-bold">@051_Hart</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Bid */}
              <div className="rounded-2lg border border-jacarta-100 bg-white p-8 dark:border-jacarta-600 dark:bg-jacarta-700">
                <div className="mb-8 sm:flex sm:flex-wrap">
                  {/* Highest bid */}
                  <div className="sm:w-1/2 sm:pr-4 lg:pr-8">
                    <div className="block overflow-hidden text-ellipsis whitespace-nowrap">
                      <span className="text-sm text-jacarta-400 dark:text-jacarta-300">
                        Highest bid by{" "}
                      </span>
                      <Link
                        href={`/user/9`}
                        className="text-sm font-bold text-accent"
                      >
                        0x695d2ef170ce69e794707eeef9497af2de25df82
                      </Link>
                    </div>
                    <div className="mt-3 flex">
                      <figure className="mr-4 shrink-0">
                        <Link href={`/user/8`} className="relative block">
                          <Image
                            width={48}
                            height={48}
                            src="/img/avatars/avatar_4.jpg"
                            alt="avatar"
                            className="rounded-2lg"
                            loading="lazy"
                          />
                        </Link>
                      </figure>
                      <div>
                        <div className="flex items-center whitespace-nowrap">
                          <span className="-ml-1" data-tippy-content="ETH">
                            <svg
                              version="1.1"
                              xmlns="http://www.w3.org/2000/svg"
                              x="0"
                              y="0"
                              viewBox="0 0 1920 1920"
                              // xml:space="preserve"
                              className="h-5 w-5"
                            >
                              <path
                                fill="#8A92B2"
                                d="M959.8 80.7L420.1 976.3 959.8 731z"
                              ></path>
                              <path
                                fill="#62688F"
                                d="M959.8 731L420.1 976.3l539.7 319.1zm539.8 245.3L959.8 80.7V731z"
                              ></path>
                              <path
                                fill="#454A75"
                                d="M959.8 1295.4l539.8-319.1L959.8 731z"
                              ></path>
                              <path
                                fill="#8A92B2"
                                d="M420.1 1078.7l539.7 760.6v-441.7z"
                              ></path>
                              <path
                                fill="#62688F"
                                d="M959.8 1397.6v441.7l540.1-760.6z"
                              ></path>
                            </svg>
                          </span>
                          <span className="text-lg font-medium leading-tight tracking-tight text-green">
                            4.7 ETH
                          </span>
                        </div>
                        <span className="text-sm text-jacarta-400 dark:text-jacarta-300">
                          ~10,864.10
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Countdown */}
                  <div className="mt-4 dark:border-jacarta-600 sm:mt-0 sm:w-1/2 sm:border-l sm:border-jacarta-100 sm:pl-4 lg:pl-8">
                    <span className="js-countdown-ends-label text-sm text-jacarta-400 dark:text-jacarta-300">
                      Auction ends in
                    </span>
                    <Timer />
                  </div>
                </div>

                <a
                  href="#"
                  data-bs-toggle="modal"
                  data-bs-target="#placeBidModal"
                  className="inline-block w-full rounded-full bg-accent py-3 px-8 text-center font-semibold text-white shadow-accent-volume transition-all hover:bg-accent-dark"
                >
                  Place Bid
                </a>
              </div>
              {/* end bid */}
            </div>
            {/* end details */}
          </div>

          {/* Tabs */}
          <Tabs />
          {/* end tabs */}
        </div>
      </section>
    </>
  );
}
