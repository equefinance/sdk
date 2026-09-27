import { erc20Abi } from 'viem';
import type { Address, Hash } from 'viem';
import { EpochStrategyAbi, EqueVaultAbi } from './abis';
import { decodeEpochState, type EpochState } from './epoch';
import { requireSigner, type EquePublicClient, type EqueWalletClient } from './internal';
import { nextBidFloor, reserveFloor } from './math';

export interface AuctionBid {
  epochId: bigint;
  bidder: Address;
  amount: bigint;
}

export interface AuctionStatus {
  state: EpochState;
  notional: bigint;
  strike: bigint;
  spot: bigint;
  highBidder: Address;
  highBid: bigint;
  reserveFloor: bigint;
  minNextBid: bigint;
  auctionEndsAt: number;
  expiresAt: number;
  endsIn: number;
}

export interface AuctionModuleParams {
  publicClient: EquePublicClient;
  walletClient: EqueWalletClient | undefined;
  strategy: Address;
  vault: Address;
}

export interface AuctionModule {
  address: Address;
  /** Approves the strategy on the underlying; the bid premium is escrowed at bid time. */
  approve(amount: bigint): Promise<Hash>;
  bid(amount: bigint): Promise<Hash>;
  getAuctionStatus(): Promise<AuctionStatus>;
  minNextBid(): Promise<bigint>;
  watchBids(onBid: (bid: AuctionBid) => void): () => void;
}

export function createAuctionModule(params: AuctionModuleParams): AuctionModule {
  const { publicClient, walletClient, strategy, vault } = params;
  let cachedToken: Address | undefined;

  const token = async (): Promise<Address> => {
    if (cachedToken === undefined) {
      cachedToken = await publicClient.readContract({
        address: vault,
        abi: EqueVaultAbi,
        functionName: 'asset',
      });
    }
    return cachedToken;
  };

  const readStatus = async () => {
    const [stateRaw, epoch, floorBps] = await Promise.all([
      publicClient.readContract({
        address: strategy,
        abi: EpochStrategyAbi,
        functionName: 'state',
      }),
      publicClient.readContract({
        address: strategy,
        abi: EpochStrategyAbi,
        functionName: 'currentEpoch',
      }),
      publicClient.readContract({
        address: strategy,
        abi: EpochStrategyAbi,
        functionName: 'floorBps',
      }),
    ]);
    const floor = reserveFloor(epoch.notional, floorBps);
    const overHigh = epoch.highBid === 0n ? 0n : nextBidFloor(epoch.highBid);
    return { stateRaw, epoch, floor, min: overHigh > floor ? overHigh : floor };
  };

  return {
    address: strategy,
    async approve(amount) {
      return requireSigner(walletClient).writeContract({
        address: await token(),
        abi: erc20Abi,
        functionName: 'approve',
        args: [strategy, amount],
      });
    },
    async bid(amount) {
      return requireSigner(walletClient).writeContract({
        address: strategy,
        abi: EpochStrategyAbi,
        functionName: 'bid',
        args: [amount],
      });
    },
    async getAuctionStatus() {
      const { stateRaw, epoch, floor, min } = await readStatus();
      const endsIn = Number(epoch.auctionEnd) - Math.floor(Date.now() / 1000);
      return {
        state: decodeEpochState(Number(stateRaw)),
        notional: epoch.notional,
        strike: epoch.strike,
        spot: epoch.spot,
        highBidder: epoch.highBidder,
        highBid: epoch.highBid,
        reserveFloor: floor,
        minNextBid: min,
        auctionEndsAt: Number(epoch.auctionEnd),
        expiresAt: Number(epoch.expiry),
        endsIn: endsIn > 0 ? endsIn : 0,
      };
    },
    async minNextBid() {
      return (await readStatus()).min;
    },
    watchBids(onBid) {
      return publicClient.watchContractEvent({
        address: strategy,
        abi: EpochStrategyAbi,
        eventName: 'BidPlaced',
        strict: true,
        onLogs: (logs) => {
          for (const log of logs) {
            onBid({ epochId: log.args.epochId, bidder: log.args.bidder, amount: log.args.amount });
          }
        },
      });
    },
  };
}
