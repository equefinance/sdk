import { createPublicClient, createWalletClient, http } from 'viem';
import type { Account, Address, Transport } from 'viem';
import { getEqueChain, type EqueChain, type EqueChainName } from './chains';
import { getAddresses, type EqueDeployment } from './addresses';
import { createAuctionModule, type AuctionModule } from './auction';
import { createEpochModule, type EpochModule } from './epoch';
import { createFaucetModule, type FaucetModule } from './faucet';
import type { EquePublicClient, EqueWalletClient } from './internal';
import { createOracleModule, type OracleModule } from './oracle';
import { createRouterModule, type RouterModule } from './router';
import { createVaultModule, type VaultModule } from './vault';

export interface CreateEqueClientParams {
  chain: EqueChainName;
  /** Overrides the chain's public default; use a private endpoint for real traffic. */
  rpcUrl?: string;
  /** Injected at runtime (wallet account, private-key account, ...). The SDK never holds keys itself. */
  signer?: Account;
}

export interface EqueClient {
  chain: EqueChainName;
  chainId: number;
  addresses: EqueDeployment;
  publicClient: EquePublicClient;
  walletClient: EqueWalletClient | undefined;
  vault(symbol: string): VaultModule;
  epoch(symbol: string): EpochModule;
  auction(symbol: string): AuctionModule;
  router(symbol: string): RouterModule;
  oracle(symbol: string): OracleModule;
  faucet: FaucetModule;
}

/**
 * Builds the client surface for one chain: viem clients plus that chain's
 * deployed addresses, so callers never juggle addresses by hand.
 */
export function createEqueClient(params: CreateEqueClientParams): EqueClient {
  const { chain, rpcUrl, signer } = params;
  const definition = getEqueChain(chain);
  const addresses = getAddresses(chain);

  const transport = rpcUrl === undefined ? http() : http(rpcUrl);
  const publicClient = createPublicClient<Transport, EqueChain>({ chain: definition, transport });
  const walletClient =
    signer === undefined
      ? undefined
      : createWalletClient<Transport, EqueChain, Account>({
          account: signer,
          chain: definition,
          transport,
        });

  const resolveVault = (symbol: string): { vault: Address; strategy: Address } => {
    const vault: Address | undefined = addresses.vaults[symbol];
    const strategy: Address | undefined = addresses.strategies[`${symbol}-epoch`];
    if (vault === undefined || strategy === undefined) {
      throw new Error(
        `Unknown vault "${symbol}" on ${chain}. Known vaults: ${Object.keys(addresses.vaults).join(', ')}.`,
      );
    }
    return { vault, strategy };
  };

  return {
    chain,
    chainId: definition.id,
    addresses,
    publicClient,
    walletClient,
    vault: (symbol) =>
      createVaultModule({ publicClient, walletClient, vault: resolveVault(symbol).vault }),
    epoch: (symbol) =>
      createEpochModule({ publicClient, walletClient, strategy: resolveVault(symbol).strategy }),
    auction: (symbol) => {
      const { vault, strategy } = resolveVault(symbol);
      return createAuctionModule({ publicClient, walletClient, strategy, vault });
    },
    router: (symbol) =>
      createRouterModule({
        publicClient,
        walletClient,
        router: addresses.router,
        vault: resolveVault(symbol).vault,
      }),
    oracle: (symbol) =>
      createOracleModule({ publicClient, strategy: resolveVault(symbol).strategy }),
    faucet: createFaucetModule({ publicClient, walletClient, faucet: addresses.faucet }),
  };
}
