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
import { TokenActionProvider } from "@/context/tokenAction";
import { Analytics } from "@vercel/analytics/next";
if (typeof window !== "undefined") {
  // Import the script only on the client side
  import("bootstrap/dist/js/bootstrap.esm").then((module) => {
    // Module is imported, you can access any exported functionality if
  });
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body
        itemScope
        itemType="http://schema.org/WebPage"
        className={
          "overflow-x-hidden font-body text-jacarta-500 dark:bg-jacarta-900"
        }
      >
        <SearchProvider>
          <AddressProvider>
            <LaunchTokenProvider>
              <TokenDetailsProvider>
                <TokenActionProvider>
                  <ModeChanger />
                  {children}
                  <MintAddressesModal />
                </TokenActionProvider>
              </TokenDetailsProvider>
            </LaunchTokenProvider>
          </AddressProvider>
        </SearchProvider>
        <Analytics />
      </body>
    </html>
  );
}
