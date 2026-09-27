import { parseAbi } from 'viem';
import type { Account, PublicClient, Transport, WalletClient } from 'viem';
import type { EqueChain } from './chains';

export type EquePublicClient = PublicClient<Transport, EqueChain>;
export type EqueWalletClient = WalletClient<Transport, EqueChain, Account>;

export const erc20ApproveAbi = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
]);

export function requireSigner(walletClient: EqueWalletClient | undefined): EqueWalletClient {
  if (walletClient === undefined) {
    throw new Error(
      'This client is read-only. Pass a signer to createEqueClient to send transactions.',
    );
  }
  return walletClient;
}
