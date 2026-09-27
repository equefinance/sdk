# Eque SDK

Shared TypeScript client for the Eque contracts: chain definitions, deployed
addresses, generated ABIs, and small typed modules (`vault`, `epoch`,
`auction`, `router`, `oracle`, `faucet`) on top of viem.

## Requirements

Node 22.18+ (the regeneration scripts execute TypeScript directly) and npm.

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm test` | Vitest suites in `test/` |
| `npm run typecheck` | Strict type check |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Usage

```ts
import { createEqueClient } from '@eque/sdk';

const client = createEqueClient({ chain: 'robinhood-testnet' });

const vault = client.vault('evNVDA');
await vault.totalAssets();
await vault.balanceOf(account);

const epoch = client.epoch('evNVDA');
await epoch.state(); // "None" | "Auction" | "Locked" | "Settled"
await epoch.auctionEndsIn();

await client.auction('evNVDA').getAuctionStatus();
await client.oracle('evNVDA').spot(); // price, updatedAt, staleness flag
await client.faucet.nextDepositorClaim(account);
```

Writes need a signer, injected at runtime:

```ts
const signing = createEqueClient({ chain: 'robinhood-testnet', signer: account });
await signing.vault('evNVDA').approve(amount);
await signing.vault('evNVDA').deposit(amount);
```

## Example

```bash
node examples/read-status.ts
```

Prints vault, epoch, auction, and oracle status for every vault on Robinhood
testnet (Read only).