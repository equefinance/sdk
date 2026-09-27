import type { Address, Hash } from 'viem';
import { EpochStrategyAbi } from './abis';
import { requireSigner, type EquePublicClient, type EqueWalletClient } from './internal';

export type EpochState = 'None' | 'Auction' | 'Locked' | 'Settled';

const EPOCH_STATES: readonly EpochState[] = ['None', 'Auction', 'Locked', 'Settled'];

export function decodeEpochState(raw: number): EpochState {
  const state: EpochState | undefined = EPOCH_STATES[raw];
  if (state === undefined) {
    throw new Error(`Epoch strategy returned unknown state ${raw}.`);
  }
  return state;
}

export interface EpochInfo {
  id: bigint;
  notional: bigint;
  start: bigint;
  auctionEnd: bigint;
  expiry: bigint;
  strike: bigint;
  spot: bigint;
  highBidder: Address;
  highBid: bigint;
  extensionCount: bigint;
}

export interface EpochModuleParams {
  publicClient: EquePublicClient;
  walletClient: EqueWalletClient | undefined;
  strategy: Address;
}

export interface EpochModule {
  address: Address;
  startEpoch(bypassMarketHours?: boolean): Promise<Hash>;
  closeAuction(): Promise<Hash>;
  settleEpoch(): Promise<Hash>;
  state(): Promise<EpochState>;
  currentEpoch(): Promise<EpochInfo>;
  auctionEndsIn(): Promise<number>;
  expiresIn(): Promise<number>;
}

export function createEpochModule(params: EpochModuleParams): EpochModule {
  const { publicClient, walletClient, strategy } = params;

  const currentEpoch = async (): Promise<EpochInfo> =>
    publicClient.readContract({
      address: strategy,
      abi: EpochStrategyAbi,
      functionName: 'currentEpoch',
    });

  const secondsUntil = async (pick: (epoch: EpochInfo) => bigint): Promise<number> => {
    const epoch = await currentEpoch();
    const remaining = Number(pick(epoch)) - Math.floor(Date.now() / 1000);
    return remaining > 0 ? remaining : 0;
  };

  return {
    address: strategy,
    async startEpoch(bypassMarketHours = false) {
      return requireSigner(walletClient).writeContract({
        address: strategy,
        abi: EpochStrategyAbi,
        functionName: 'startEpoch',
        args: [bypassMarketHours],
      });
    },
    async closeAuction() {
      return requireSigner(walletClient).writeContract({
        address: strategy,
        abi: EpochStrategyAbi,
        functionName: 'closeAuction',
      });
    },
    async settleEpoch() {
      return requireSigner(walletClient).writeContract({
        address: strategy,
        abi: EpochStrategyAbi,
        functionName: 'settleEpoch',
      });
    },
    async state() {
      const raw = await publicClient.readContract({
        address: strategy,
        abi: EpochStrategyAbi,
        functionName: 'state',
      });
      return decodeEpochState(Number(raw));
    },
    currentEpoch,
    auctionEndsIn: () => secondsUntil((epoch) => epoch.auctionEnd),
    expiresIn: () => secondsUntil((epoch) => epoch.expiry),
  };
}
