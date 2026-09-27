import type { Address } from 'viem';
import { EpochStrategyAbi, MockV3AggregatorAbi } from './abis';
import type { EquePublicClient } from './internal';

interface FeedConfig {
  aggregator: Address;
  heartbeat: number;
  stalenessBuffer: number;
}

export interface OracleSpot {
  price: bigint;
  decimals: number;
  updatedAt: number;
  ageSeconds: number;
  heartbeatSeconds: number;
  /** Mirrors the strategy's own check: updatedAt + heartbeat + buffer in the past. */
  stale: boolean;
}

export interface OracleModuleParams {
  publicClient: EquePublicClient;
  strategy: Address;
}

export interface OracleModule {
  address: Address;
  aggregator(): Promise<Address>;
  spot(): Promise<OracleSpot>;
}

export function createOracleModule(params: OracleModuleParams): OracleModule {
  const { publicClient, strategy } = params;
  let cachedFeed: FeedConfig | undefined;

  const feedConfig = async (): Promise<FeedConfig> => {
    if (cachedFeed === undefined) {
      const [aggregator, , heartbeat, stalenessBuffer] = await publicClient.readContract({
        address: strategy,
        abi: EpochStrategyAbi,
        functionName: 'feed',
      });
      cachedFeed = { aggregator, heartbeat, stalenessBuffer };
    }
    return cachedFeed;
  };

  return {
    address: strategy,
    async aggregator() {
      return (await feedConfig()).aggregator;
    },
    async spot() {
      const feed = await feedConfig();
      const [[, answer, , updatedAt], decimals] = await Promise.all([
        publicClient.readContract({
          address: feed.aggregator,
          abi: MockV3AggregatorAbi,
          functionName: 'latestRoundData',
        }),
        publicClient.readContract({
          address: feed.aggregator,
          abi: MockV3AggregatorAbi,
          functionName: 'decimals',
        }),
      ]);
      if (answer <= 0n) {
        throw new Error(`Oracle feed ${feed.aggregator} returned no usable price.`);
      }
      const updated = Number(updatedAt);
      const ageSeconds = Math.floor(Date.now() / 1000) - updated;
      return {
        price: answer,
        decimals,
        updatedAt: updated,
        ageSeconds,
        heartbeatSeconds: feed.heartbeat,
        stale: ageSeconds > feed.heartbeat + feed.stalenessBuffer,
      };
    },
  };
}
