import { parseAbi, type Address, type Hash } from 'viem';
import { requireSigner, type EquePublicClient, type EqueWalletClient } from './internal';

const routerAbi = parseAbi([
  'function planAllocation(address vault) view returns (address[] strategies, uint256[] amounts)',
  'function weights(address vault) view returns (uint256 epochBps, uint256 lendingBps)',
]);

const vaultAbi = parseAbi(['function allocate()']);

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
        abi: routerAbi,
        functionName: 'weights',
        args: [vault],
      });
      return { epochBps, lendingBps };
    },
    async planAllocation() {
      const [strategies, amounts] = await publicClient.readContract({
        address: router,
        abi: routerAbi,
        functionName: 'planAllocation',
        args: [vault],
      });
      return { strategies, amounts };
    },
    async allocate() {
      return requireSigner(walletClient).writeContract({
        address: vault,
        abi: vaultAbi,
        functionName: 'allocate',
      });
    },
  };
}
