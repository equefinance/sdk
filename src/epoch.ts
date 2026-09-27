import { parseAbi, type Address, type Hash } from 'viem';
import { requireSigner, type EquePublicClient, type EqueWalletClient } from './internal';

const strategyAbi = parseAbi([
  'function currentEpoch() view returns ((uint128 id, uint128 notional, uint64 start, uint64 auctionEnd, uint64 expiry, uint96 strike, uint96 spot, address highBidder, uint96 highBid, uint256 extensionCount))',
  'function startEpoch(bool bypassMarketHours)',
  'function closeAuction()',
  'function settleEpoch()',
  'function state() view returns (uint8)',
]);

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
      abi: strategyAbi,
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
        abi: strategyAbi,
        functionName: 'startEpoch',
        args: [bypassMarketHours],
      });
    },
    async closeAuction() {
      return requireSigner(walletClient).writeContract({
        address: strategy,
        abi: strategyAbi,
        functionName: 'closeAuction',
      });
    },
    async settleEpoch() {
      return requireSigner(walletClient).writeContract({
        address: strategy,
        abi: strategyAbi,
        functionName: 'settleEpoch',
      });
    },
    async state() {
      const raw = await publicClient.readContract({
        address: strategy,
        abi: strategyAbi,
        functionName: 'state',
      });
      return decodeEpochState(Number(raw));
    },
    currentEpoch,
    auctionEndsIn: () => secondsUntil((epoch) => epoch.auctionEnd),
    expiresIn: () => secondsUntil((epoch) => epoch.expiry),
  };
}
