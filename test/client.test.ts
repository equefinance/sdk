import { describe, expect, it } from 'vitest';
import { createPublicClient, custom, encodeFunctionResult, getAddress, toFunctionSelector, zeroAddress } from 'viem';
import type { Transport } from 'viem';
import { robinhoodTestnet } from 'viem/chains';
import { EpochStrategyAbi, EqueVaultAbi } from '../src/abis';
import { createEqueClient, deployments, equeChains, getAddresses, getEqueChain } from '../src/index';
import { createEpochModule, decodeEpochState } from '../src/epoch';
import type { EqueChain } from '../src/chains';
import { createVaultModule } from '../src/vault';

const VAULT = getAddress('0x00000000000000000000000000000000000000aa');
const TOKEN = getAddress('0x00000000000000000000000000000000000000bb');
const STRATEGY = getAddress('0x00000000000000000000000000000000000000cc');

const ASSET_CALL = toFunctionSelector('function asset()');
const TOTAL_ASSETS_CALL = toFunctionSelector('function totalAssets()');
const STATE_CALL = toFunctionSelector('function state()');
const CURRENT_EPOCH_CALL = toFunctionSelector('function currentEpoch()');

function mockTransport(responses: Record<string, `0x${string}`>, calls: string[] = []) {
  return custom({
    request: async ({ method, params }) => {
      if (method !== 'eth_call') {
        throw new Error(`Unexpected RPC method ${method}`);
      }
      const [{ data }] = params as [{ data: `0x${string}` }];
      calls.push(data.slice(0, 10));
      const response = responses[data.slice(0, 10)];
      if (response === undefined) {
        throw new Error(`No mocked response for call ${data}`);
      }
      return response;
    },
  });
}

function mockClient(responses: Record<string, `0x${string}`>, calls: string[] = []) {
  return createPublicClient<Transport, EqueChain>({
    chain: getEqueChain('robinhood-testnet'),
    transport: mockTransport(responses, calls),
  });
}

describe('client construction', () => {
  it('binds the chain, registry, and module addresses', () => {
    const client = createEqueClient({ chain: 'robinhood-testnet' });
    const deployed = getAddresses('robinhood-testnet');
    expect(client.chain).toBe('robinhood-testnet');
    expect(client.chainId).toBe(46630);
    expect(client.addresses).toBe(deployed);
    expect(client.walletClient).toBeUndefined();
    expect(client.vault('evNVDA').address).toBe(deployed.vaults['evNVDA']);
    expect(client.epoch('evNVDA').address).toBe(deployed.strategies['evNVDA-epoch']);
    expect(client.auction('evNVDA').address).toBe(deployed.strategies['evNVDA-epoch']);
    expect(client.router('evNVDA').address).toBe(deployed.router);
    expect(client.oracle('evNVDA').address).toBe(deployed.strategies['evNVDA-epoch']);
    expect(client.faucet.address).toBe(deployed.faucet);
  });

  it('throws when the registry chainId does not match the chain', () => {
    const original = deployments['robinhood-testnet'];
    deployments['robinhood-testnet'] = { ...original, chainId: 1 };
    try {
      expect(() => createEqueClient({ chain: 'robinhood-testnet' })).toThrow(
        /Deployment record for robinhood-testnet is for chainId 1/,
      );
    } finally {
      deployments['robinhood-testnet'] = original;
    }
  });

  it('uses the viem chain definitions and rejects unknown vaults', () => {
    expect(equeChains['robinhood-testnet']).toBe(robinhoodTestnet);
    expect(equeChains['base-sepolia'].id).toBe(84532);
    const client = createEqueClient({ chain: 'base-sepolia' });
    expect(() => client.vault('evNVDA')).toThrow(/Unknown vault "evNVDA" on base-sepolia/);
  });
});

describe('address registry', () => {
  it('carries the deployed networks', () => {
    expect(Object.keys(deployments).length).toBeGreaterThanOrEqual(5);
    expect(getAddresses('robinhood-testnet').chainId).toBe(46630);
    expect(getAddresses('robinhood-testnet').vaults['evNVDA']).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it('throws on unknown networks', () => {
    expect(() => getAddresses('arbitrum')).toThrow(/No Eque deployment recorded for arbitrum/);
    expect(() => getEqueChain('arbitrum')).toThrow(/Unknown Eque chain "arbitrum"/);
  });
});

describe('vault module over a mocked transport', () => {
  it('decodes reads and caches the resolved underlying', async () => {
    const calls: string[] = [];
    const client = mockClient(
      {
        [ASSET_CALL]: encodeFunctionResult({ abi: EqueVaultAbi, functionName: 'asset', result: TOKEN }),
        [TOTAL_ASSETS_CALL]: encodeFunctionResult({ abi: EqueVaultAbi, functionName: 'totalAssets', result: 123n }),
      },
      calls,
    );

    const vault = createVaultModule({ publicClient: client, walletClient: undefined, vault: VAULT });
    expect(await vault.totalAssets()).toBe(123n);
    expect(await vault.asset()).toBe(TOKEN);
    expect(await vault.asset()).toBe(TOKEN);
    expect(calls.filter((call) => call === ASSET_CALL)).toHaveLength(1);
  });

  it('refuses writes without a signer', async () => {
    const client = mockClient({});
    const vault = createVaultModule({ publicClient: client, walletClient: undefined, vault: VAULT });
    await expect(vault.deposit(1n)).rejects.toThrow(/read-only/);
    await expect(vault.requestRedeem(1n)).rejects.toThrow(/read-only/);
    await expect(vault.claim()).rejects.toThrow(/read-only/);
  });
});

describe('epoch module over a mocked transport', () => {
  it('decodes state and countdowns', async () => {
    const now = Math.floor(Date.now() / 1000);
    const client = mockClient({
      [STATE_CALL]: encodeFunctionResult({ abi: EpochStrategyAbi, functionName: 'state', result: 2 }),
      [CURRENT_EPOCH_CALL]: encodeFunctionResult({
        abi: EpochStrategyAbi,
        functionName: 'currentEpoch',
        result: {
          id: 1n,
          notional: 10n ** 18n,
          start: BigInt(now),
          auctionEnd: BigInt(now + 120),
          expiry: BigInt(now + 300),
          strike: 2n * 10n ** 20n,
          spot: 19n * 10n ** 19n,
          highBidder: zeroAddress,
          highBid: 0n,
          extensionCount: 0n,
        },
      }),
    });

    const epoch = createEpochModule({ publicClient: client, walletClient: undefined, strategy: STRATEGY });
    expect(await epoch.state()).toBe('Locked');
    expect((await epoch.currentEpoch()).notional).toBe(10n ** 18n);
    expect(await epoch.auctionEndsIn()).toBeGreaterThan(0);
    expect(await epoch.auctionEndsIn()).toBeLessThanOrEqual(120);
    expect(await epoch.expiresIn()).toBeGreaterThan(0);
    expect(await epoch.expiresIn()).toBeLessThanOrEqual(300);
  });

  it('rejects unknown state values and refuses keeper writes without a signer', async () => {
    const client = mockClient({
      [STATE_CALL]: encodeFunctionResult({ abi: EpochStrategyAbi, functionName: 'state', result: 9 }),
    });
    const epoch = createEpochModule({ publicClient: client, walletClient: undefined, strategy: STRATEGY });
    await expect(epoch.state()).rejects.toThrow(/unknown state 9/);
    await expect(epoch.startEpoch(true)).rejects.toThrow(/read-only/);
    await expect(epoch.closeAuction()).rejects.toThrow(/read-only/);
    await expect(epoch.settleEpoch()).rejects.toThrow(/read-only/);
    expect(decodeEpochState(3)).toBe('Settled');
  });
});