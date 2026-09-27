import { describe, expect, it } from 'vitest';
import { nextBidFloor, payoff, reserveFloor } from '../src/math';

const WAD = 10n ** 18n;
const ETHER = (n: number) => BigInt(n) * WAD;

describe('payoff', () => {
  it('matches the worked in-the-money example from the contracts suite', () => {
    expect(payoff(ETHER(10), ETHER(200), ETHER(189))).toBe(55n * 10n ** 16n);
  });

  it('is zero when spot is at or below the strike', () => {
    expect(payoff(ETHER(10), ETHER(189), ETHER(189))).toBe(0n);
    expect(payoff(ETHER(10), ETHER(180), ETHER(189))).toBe(0n);
  });

  it('is zero without notional or without a price', () => {
    expect(payoff(0n, ETHER(200), ETHER(189))).toBe(0n);
    expect(payoff(ETHER(10), 0n, ETHER(189))).toBe(0n);
  });

  it('never exceeds the notional', () => {
    expect(payoff(ETHER(10), 10n ** 30n, 1n)).toBeLessThanOrEqual(ETHER(10));
  });
});

describe('reserveFloor', () => {
  it('is the configured fraction of the notional', () => {
    expect(reserveFloor(ETHER(10), 120n)).toBe(12n * 10n ** 16n);
  });

  it('rounds up so any nonzero notional reserves at least one wei', () => {
    expect(reserveFloor(1n, 120n)).toBe(1n);
  });

  it('is zero for a zero notional', () => {
    expect(reserveFloor(0n, 120n)).toBe(0n);
  });
});

describe('nextBidFloor', () => {
  it('is one percent over the current high, plus one wei', () => {
    expect(nextBidFloor(ETHER(1))).toBe(101n * 10n ** 16n + 1n);
    expect(nextBidFloor(ETHER(101)) - 1n).toBe(10201n * 10n ** 16n);
  });

  it('is zero without a current high', () => {
    expect(nextBidFloor(0n)).toBe(0n);
  });

  it('never lets a bid equal to the current high qualify', () => {
    expect(nextBidFloor(ETHER(1))).toBeGreaterThan(ETHER(1));
    expect(nextBidFloor(ETHER(1))).toBeGreaterThan(101n * 10n ** 16n);
  });
});