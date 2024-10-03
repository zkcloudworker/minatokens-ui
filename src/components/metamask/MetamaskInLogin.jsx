"use client";
import { useMetaMask } from "metamask-react";
import Image from "next/image";

const MetaMaskLogin = () => {
  const { status, connect, account, chainId, ethereum } = useMetaMask();

  if (status === "initializing")
    return (
      <button className="js-wallet bg-accent hover:bg-accent-dark mb-4 flex w-full items-center justify-center rounded-full border-2 border-transparent py-4 px-8 text-center font-semibold text-white transition-all">
        <Image
          src="/img/wallets/metamask_24.svg"
          className="mr-2.5 inline-block h-6 w-6 object-contain"
          alt="icon"
          height={24}
          width={24}
        />
        <span className="ml-2.5">Metamask initializing</span>
      </button>
    );

  if (status === "unavailable")
    return (
      <button className="js-wallet bg-accent hover:bg-accent-dark mb-4 flex w-full items-center justify-center rounded-full border-2 border-transparent py-4 px-8 text-center font-semibold text-white transition-all">
        <Image
          src="/img/wallets/metamask_24.svg"
          className="mr-2.5 inline-block h-6 w-6 object-contain"
          alt="icon"
          height={24}
          width={24}
        />
        <span className="ml-2.5">unavailable</span>
      </button>
    );

  if (status === "notConnected")
    return (
      <button
        className="js-wallet bg-accent hover:bg-accent-dark mb-4 flex w-full items-center justify-center rounded-full border-2 border-transparent py-4 px-8 text-center font-semibold text-white transition-all"
        onClick={connect}
      >
        <Image
          src="/img/wallets/metamask_24.svg"
          className="inline-block h-6 w-6"
          alt="icon"
          height={24}
          width={24}
        />
        <span className="ml-2.5">Sign in with Metamask</span>
      </button>
    );

  if (status === "connecting")
    return (
      <button className="js-wallet bg-accent hover:bg-accent-dark mb-4 flex w-full items-center justify-center rounded-full border-2 border-transparent py-4 px-8 text-center font-semibold text-white transition-all">
        <Image
          src="/img/wallets/metamask_24.svg"
          className="mr-2.5 inline-block h-6 w-6"
          alt="icon"
          height={24}
          width={24}
        />
        <span className="ml-2.5">Metamask connecting</span>
      </button>
    );

  if (status === "connected")
    return (
      <button className="js-wallet bg-accent hover:bg-accent-dark mb-4 flex w-full items-center justify-center rounded-full border-2 border-transparent py-4 px-8 text-center font-semibold text-white transition-all">
        <Image
          src="/img/wallets/metamask_24.svg"
          className=" inline-block h-6 w-6"
          alt="icon"
          height={24}
          width={24}
        />
        <span className="ml-2.5">Sign in with Metamask</span>
      </button>
    );
};

export default MetaMaskLogin;
