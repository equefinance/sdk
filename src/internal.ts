import type { Account, PublicClient, Transport, WalletClient } from 'viem';
import type { EqueChain } from './chains';

export type EquePublicClient = PublicClient<Transport, EqueChain>;
export type EqueWalletClient = WalletClient<Transport, EqueChain, Account>;

export function requireSigner(walletClient: EqueWalletClient | undefined): EqueWalletClient {
  if (walletClient === undefined) {
    throw new Error(
      'This client is read-only. Pass a signer to createEqueClient to send transactions.',
    );
  }
  return walletClient;
}
