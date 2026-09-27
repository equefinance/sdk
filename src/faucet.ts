import { parseAbi, type Address, type Hash } from 'viem';
import { requireSigner, type EquePublicClient, type EqueWalletClient } from './internal';

const faucetAbi = parseAbi([
  'function claimDepositor() returns (uint256)',
  'function nextDepositorClaim(address wallet) view returns (uint256)',
]);

export interface FaucetClaimResult {
  claimed: boolean;
  readyAt: number;
  hash?: Hash;
}

export interface FaucetModuleParams {
  publicClient: EquePublicClient;
  walletClient: EqueWalletClient | undefined;
  faucet: Address;
}

export interface FaucetModule {
  address: Address;
  nextDepositorClaim(wallet: Address): Promise<number>;
  /** Idempotent: wallets inside the cooldown get `claimed: false` and no transaction. */
  claimDepositor(): Promise<FaucetClaimResult>;
}

export function createFaucetModule(params: FaucetModuleParams): FaucetModule {
  const { publicClient, walletClient, faucet } = params;

  const nextDepositorClaim = (wallet: Address): Promise<bigint> =>
    publicClient.readContract({
      address: faucet,
      abi: faucetAbi,
      functionName: 'nextDepositorClaim',
      args: [wallet],
    });

  return {
    address: faucet,
    nextDepositorClaim: async (wallet) => Number(await nextDepositorClaim(wallet)),
    async claimDepositor() {
      const wallet = requireSigner(walletClient);
      const account = wallet.account.address;
      const [readyAt, block] = await Promise.all([
        nextDepositorClaim(account),
        publicClient.getBlock({ blockTag: 'latest' }),
      ]);
      if (block.timestamp < readyAt) {
        return { claimed: false, readyAt: Number(readyAt) };
      }
      const hash = await wallet.writeContract({
        address: faucet,
        abi: faucetAbi,
        functionName: 'claimDepositor',
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return { claimed: true, readyAt: Number(await nextDepositorClaim(account)), hash };
    },
  };
}
