import { baseSepolia, robinhoodTestnet } from 'viem/chains';

export const equeChains = {
  'base-sepolia': baseSepolia,
  'robinhood-testnet': robinhoodTestnet,
} as const;

export type EqueChainName = keyof typeof equeChains;
export type EqueChain = (typeof equeChains)[EqueChainName];

export function getEqueChain(name: string): EqueChain {
  const chain = (equeChains as Record<string, EqueChain>)[name];
  if (chain === undefined) {
    throw new Error(
      `Unknown Eque chain "${name}". Supported chains: ${Object.keys(equeChains).join(', ')}.`,
    );
  }
  return chain;
}
