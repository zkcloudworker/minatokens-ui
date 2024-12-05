"use client";
import Link from "next/link";

export function ContactAuthorized() {
  return (
    <div className="rounded-t-2lg rounded-b-2lg rounded-tl-none border border-jacarta-100 bg-white p-6 dark:border-jacarta-600 dark:bg-jacarta-700 md:p-10">
      <div className="mb-2 flex items-center">
        <span className="mr-2 min-w-[14rem] dark:text-jacarta-300">
          <p className="mb-8 text-center text-md dark:text-jacarta-200 md:text-left">
            Contact Authorized Developer to enable those actions for your token
          </p>
          <div className="flex space-x-4">
            <Link
              href="/authorized"
              className="w-36 rounded-full bg-accent py-3 px-8 text-center font-semibold text-white shadow-accent-volume transition-all hover:bg-accent-dark"
            >
              Contact
            </Link>
          </div>
        </span>
      </div>
    </div>
  );
}
