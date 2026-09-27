import { createEqueClient, MockB20Abi } from '@eque/sdk';
import { formatUnits, zeroAddress } from 'viem';

const client = createEqueClient({
  chain: 'robinhood-testnet',
  rpcUrl: 'https://rpc.testnet.chain.robinhood.com',
});

const underlyingSymbol = (asset: string) =>
  Object.entries(client.addresses.tokens).find(([, address]) => address.toLowerCase() === asset.toLowerCase())
    ?.[0] ?? 'unknown';

console.log(`Eque status on ${client.chain} (chainId ${client.chainId}), read-only\n`);

for (const symbol of Object.keys(client.addresses.vaults)) {
  const vault = client.vault(symbol);
  const epoch = client.epoch(symbol);
  const auction = client.auction(symbol);
  const oracle = client.oracle(symbol);

  const asset = await vault.asset();
  const [totalAssets, decimals, state, current, status, spot, expiresIn] = await Promise.all([
    vault.totalAssets(),
    client.publicClient.readContract({ address: asset, abi: MockB20Abi, functionName: 'decimals' }),
    epoch.state(),
    epoch.currentEpoch(),
    auction.getAuctionStatus(),
    oracle.spot(),
    epoch.expiresIn(),
  ]);

  const underlying = Number(decimals);
  console.log(`${symbol}  ${vault.address}`);
  console.log(
    `  underlying   ${underlyingSymbol(asset)}   totalAssets ${formatUnits(totalAssets, underlying)}`,
  );
  console.log(
    `  epoch        ${state} #${current.id}   notional ${formatUnits(current.notional, underlying)}` +
      `   strike ${formatUnits(current.strike, 18)}   spot ${formatUnits(current.spot, 18)}` +
      `   expires in ${expiresIn}s`,
  );
  console.log(
    `  auction      high ${formatUnits(status.highBid, underlying)}` +
      ` by ${status.highBidder === zeroAddress ? 'nobody' : status.highBidder}` +
      `   minNext ${formatUnits(status.minNextBid, underlying)}   ends in ${status.endsIn}s`,
  );
  console.log(
    `  oracle       ${formatUnits(spot.price, spot.decimals)}   age ${Math.round(spot.ageSeconds / 60)}m` +
      `   ${spot.stale ? 'stale' : 'fresh'}`,
  );
  console.log();
}