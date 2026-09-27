const BPS = 10_000n;

function mulDivCeil(a: bigint, b: bigint, denominator: bigint): bigint {
  return (a * b + denominator - 1n) / denominator;
}

/** Cash-settled call payoff in underlying units; zero when spot is at or below strike. */
export function payoff(notional: bigint, spot: bigint, strike: bigint): bigint {
  if (spot === 0n || spot <= strike || notional === 0n) return 0n;
  return (notional * (spot - strike)) / spot;
}

export function reserveFloor(notional: bigint, floorBps: bigint): bigint {
  return mulDivCeil(notional, floorBps, BPS);
}

/** Minimum acceptable next bid: 1% over the current high, so a repeat bid can never qualify. */
export function nextBidFloor(currentHigh: bigint): bigint {
  if (currentHigh === 0n) return 0n;
  return mulDivCeil(currentHigh, 10_100n, BPS) + 1n;
}
