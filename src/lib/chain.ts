export function getChain(): "mainnet" | "devnet" {
  const chain = process.env.NEXT_PUBLIC_CHAIN;
  if (chain === undefined) throw new Error("NEXT_PUBLIC_CHAIN is undefined");
  if (chain !== "devnet" && chain !== "mainnet")
    throw new Error("NEXT_PUBLIC_CHAIN must be devnet or mainnet");
  return chain;
}
