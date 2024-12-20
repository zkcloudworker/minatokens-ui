"use client";

import "@/public/styles/style.css";
import "swiper/css";
// import "swiper/css/pagination";
import "tippy.js/dist/tippy.css";
import "react-modal-video/css/modal-video.css";
import { MintAddressesModal } from "@/components/modals/MintAddressesModal";
import ModeChanger from "@/components/common/ModeChanger";
import { LaunchTokenProvider } from "@/context/launch";
import { TokenDetailsProvider } from "@/context/details";
import { SearchProvider } from "@/context/search";
import { AddressProvider } from "@/context/address";
import { TransactionStoreProvider } from "@/context/tx-provider";
import { Analytics } from "@vercel/analytics/next";
import GoogleAnalytics from "@/components/GoogleAnalytics";

if (typeof window !== "undefined") {
  // Import the script only on the client side
  import("bootstrap/dist/js/bootstrap.esm" as any).then((module) => {
    // Module is imported, you can access any exported functionality if
  });
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <html lang="en" className="dark">
        <head>
          <GoogleAnalytics
            GA_MEASUREMENT_ID={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}
          />
        </head>
        <body
          itemScope
          itemType="http://schema.org/WebPage"
          className="overflow-x-hidden font-body text-jacarta-500 dark:bg-jacarta-900"
        >
          <SearchProvider>
            <AddressProvider>
              <LaunchTokenProvider>
                <TokenDetailsProvider>
                  <TransactionStoreProvider>
                    <ModeChanger />
                    {children}
                    <MintAddressesModal onSubmit={() => {}} />
                  </TransactionStoreProvider>
                </TokenDetailsProvider>
              </LaunchTokenProvider>
            </AddressProvider>
          </SearchProvider>
          <Analytics />
        </body>
      </html>
    </>
  );
}
