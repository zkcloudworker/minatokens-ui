"use client";

import WalletModal from "@/components/modals/WalletModal";
import "../public/styles/style.css";
import "swiper/css";
// import "swiper/css/pagination";
import { MetaMaskProvider } from "metamask-react";
import "tippy.js/dist/tippy.css";
import "react-modal-video/css/modal-video.css";
import BuyModal from "@/components/modals/BuyModal";
import BidModal from "@/components/modals/BidModal";
import PropertiesModal from "@/components/modals/PropertiesModal";
import LevelsModal from "@/components/modals/LevelsModal";
import ModeChanger from "@/components/common/ModeChanger";
if (typeof window !== "undefined") {
  // Import the script only on the client side
  import("bootstrap/dist/js/bootstrap.esm").then((module) => {
    // Module is imported, you can access any exported functionality if
  });
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        itemScope
        itemType="http://schema.org/WebPage"
        className={
          "overflow-x-hidden font-body text-jacarta-500 dark:bg-jacarta-900"
        }
      >
        <ModeChanger />
        <MetaMaskProvider>{children}</MetaMaskProvider>
        <WalletModal />
        <BuyModal />
        <BidModal />
        <PropertiesModal />
        <LevelsModal />
      </body>
    </html>
  );
}
