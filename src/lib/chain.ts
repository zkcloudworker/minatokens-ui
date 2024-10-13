export function getChain(): "mainnet" | "devnet" {
  const chain = process.env.NEXT_PUBLIC_CHAIN;
  if (chain === undefined) throw new Error("NEXT_PUBLIC_CHAIN is undefined");
  if (chain !== "devnet" && chain !== "mainnet")
    throw new Error("NEXT_PUBLIC_CHAIN must be devnet or mainnet");
  return chain;
}

export function getChainId(): "mina:mainnet" | "mina:testnet" {
  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID;
  if (chainId === undefined)
    throw new Error("NEXT_PUBLIC_CHAIN_ID is undefined");
  if (chainId !== "mina:mainnet" && chainId !== "mina:testnet")
    throw new Error(
      "NEXT_PUBLIC_CHAIN_ID must be mina:mainnet or mina:testnet"
    );
  return chainId;
}
