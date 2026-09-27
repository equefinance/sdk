import { baseSepolia, robinhoodTestnet } from "viem/chains";

export const eqeChains = {
  "base-sepolia": baseSepolia,
  "robinhood-testnet": robinhoodTestnet,
} as const;

export type EqueChainName = keyof typeof eqeChains;
export type EqueChain = (typeof eqeChains)[EqueChainName];

export function getEqueChain(name: string): EqueChain {
  const chain = (eqeChains as Record<string, EqueChain>)[name];
  if (chain === undefined) {
    throw new Error(`Unknown Eque chain "${name}". Supported chains: ${Object.keys(eqeChains).join(", ")}.`);
  }
  return chain;
}