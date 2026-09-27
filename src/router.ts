import type { Address, Hash } from 'viem';
import { EqueRouterAbi, EqueVaultAbi } from './abis';
import { requireSigner, type EquePublicClient, type EqueWalletClient } from './internal';

export interface TargetWeights {
  epochBps: bigint;
  lendingBps: bigint;
}

export interface AllocationPlan {
  strategies: readonly Address[];
  amounts: readonly bigint[];
}

export interface RouterModuleParams {
  publicClient: EquePublicClient;
  walletClient: EqueWalletClient | undefined;
  router: Address;
  vault: Address;
}

export interface RouterModule {
  address: Address;
  targetWeights(): Promise<TargetWeights>;
  planAllocation(): Promise<AllocationPlan>;
  allocate(): Promise<Hash>;
}

export function createRouterModule(params: RouterModuleParams): RouterModule {
  const { publicClient, walletClient, router, vault } = params;

  return {
    address: router,
    async targetWeights() {
      const [epochBps, lendingBps] = await publicClient.readContract({
        address: router,
        abi: EqueRouterAbi,
        functionName: 'weights',
        args: [vault],
      });
      return { epochBps, lendingBps };
    },
    async planAllocation() {
      const [strategies, amounts] = await publicClient.readContract({
        address: router,
        abi: EqueRouterAbi,
        functionName: 'planAllocation',
        args: [vault],
      });
      return { strategies, amounts };
    },
    async allocate() {
      return requireSigner(walletClient).writeContract({
        address: vault,
        abi: EqueVaultAbi,
        functionName: 'allocate',
      });
    },
  };
}
