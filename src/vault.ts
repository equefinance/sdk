import { erc20Abi } from 'viem';
import type { Address, Hash } from 'viem';
import { EqueVaultAbi } from './abis';
import { requireSigner, type EquePublicClient, type EqueWalletClient } from './internal';

export interface VaultModuleParams {
  publicClient: EquePublicClient;
  walletClient: EqueWalletClient | undefined;
  vault: Address;
}

export interface VaultModule {
  address: Address;
  asset(): Promise<Address>;
  /** Approves the vault on the underlying token; required once before deposit. */
  approve(amount: bigint): Promise<Hash>;
  deposit(assets: bigint, receiver?: Address): Promise<Hash>;
  requestRedeem(shares: bigint): Promise<Hash>;
  claim(): Promise<Hash>;
  balanceOf(account: Address): Promise<bigint>;
  convertToAssets(shares: bigint): Promise<bigint>;
  totalAssets(): Promise<bigint>;
}

export function createVaultModule(params: VaultModuleParams): VaultModule {
  const { publicClient, walletClient, vault } = params;
  let cachedAsset: Address | undefined;

  const asset = async (): Promise<Address> => {
    if (cachedAsset === undefined) {
      cachedAsset = await publicClient.readContract({
        address: vault,
        abi: EqueVaultAbi,
        functionName: 'asset',
      });
    }
    return cachedAsset;
  };

  return {
    address: vault,
    asset,
    async approve(amount) {
      const wallet = requireSigner(walletClient);
      return wallet.writeContract({
        address: await asset(),
        abi: erc20Abi,
        functionName: 'approve',
        args: [vault, amount],
      });
    },
    async deposit(assets, receiver) {
      const wallet = requireSigner(walletClient);
      return wallet.writeContract({
        address: vault,
        abi: EqueVaultAbi,
        functionName: 'deposit',
        args: [assets, receiver ?? wallet.account.address],
      });
    },
    async requestRedeem(shares) {
      return requireSigner(walletClient).writeContract({
        address: vault,
        abi: EqueVaultAbi,
        functionName: 'requestRedeem',
        args: [shares],
      });
    },
    async claim() {
      return requireSigner(walletClient).writeContract({
        address: vault,
        abi: EqueVaultAbi,
        functionName: 'claim',
      });
    },
    balanceOf: (account) =>
      publicClient.readContract({
        address: vault,
        abi: EqueVaultAbi,
        functionName: 'balanceOf',
        args: [account],
      }),
    convertToAssets: (shares) =>
      publicClient.readContract({
        address: vault,
        abi: EqueVaultAbi,
        functionName: 'convertToAssets',
        args: [shares],
      }),
    totalAssets: () =>
      publicClient.readContract({ address: vault, abi: EqueVaultAbi, functionName: 'totalAssets' }),
  };
}
