import { parseAbi, type Address, type Hash } from 'viem';
import {
  erc20ApproveAbi,
  requireSigner,
  type EquePublicClient,
  type EqueWalletClient,
} from './internal';

const vaultAbi = parseAbi([
  'function asset() view returns (address)',
  'function balanceOf(address account) view returns (uint256)',
  'function convertToAssets(uint256 shares) view returns (uint256)',
  'function deposit(uint256 assets, address receiver) returns (uint256)',
  'function requestRedeem(uint256 shares)',
  'function claim() returns (uint256)',
  'function totalAssets() view returns (uint256)',
]);

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
        abi: vaultAbi,
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
        abi: erc20ApproveAbi,
        functionName: 'approve',
        args: [vault, amount],
      });
    },
    async deposit(assets, receiver) {
      const wallet = requireSigner(walletClient);
      return wallet.writeContract({
        address: vault,
        abi: vaultAbi,
        functionName: 'deposit',
        args: [assets, receiver ?? wallet.account.address],
      });
    },
    async requestRedeem(shares) {
      return requireSigner(walletClient).writeContract({
        address: vault,
        abi: vaultAbi,
        functionName: 'requestRedeem',
        args: [shares],
      });
    },
    async claim() {
      return requireSigner(walletClient).writeContract({
        address: vault,
        abi: vaultAbi,
        functionName: 'claim',
      });
    },
    balanceOf: (account) =>
      publicClient.readContract({
        address: vault,
        abi: vaultAbi,
        functionName: 'balanceOf',
        args: [account],
      }),
    convertToAssets: (shares) =>
      publicClient.readContract({
        address: vault,
        abi: vaultAbi,
        functionName: 'convertToAssets',
        args: [shares],
      }),
    totalAssets: () =>
      publicClient.readContract({ address: vault, abi: vaultAbi, functionName: 'totalAssets' }),
  };
}
