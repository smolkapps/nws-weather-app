import { describe, expect, it } from 'vitest';
import {
  allKalshiTempMarkets,
  buildTempBuckets,
  findKalshiTempMarket,
} from '../kalshi';

describe('findKalshiTempMarket', () => {
  it('finds a market by city name, case-insensitively', () => {
    const m = findKalshiTempMarket('new york');
    expect(m).not.toBeNull();
    expect(m?.seriesTicker).toBe('KXHIGHNY');
    expect(m?.url).toContain('kalshi.com');
  });

  it('matches city and state when state is provided', () => {
    const m = findKalshiTempMarket('Chicago', 'IL');
    expect(m?.seriesTicker).toBe('KXHIGHCHI');
  });

  it('rejects a wrong state for a known city name', () => {
    // There is no Kalshi "Chicago, CA" market, so a mismatched state -> null.
    expect(findKalshiTempMarket('Chicago', 'CA')).toBeNull();
  });

  it('returns null for cities with no market', () => {
    expect(findKalshiTempMarket('Hoboken', 'NJ')).toBeNull();
    expect(findKalshiTempMarket('')).toBeNull();
    expect(findKalshiTempMarket(null)).toBeNull();
  });

  it('exposes a stable list of all markets', () => {
    const all = allKalshiTempMarkets();
    expect(all.length).toBeGreaterThanOrEqual(7);
    // Every market has the required shape.
    for (const m of all) {
      expect(m.seriesTicker).toMatch(/^KXHIGH/);
      expect(m.url).toMatch(/^https:\/\/kalshi\.com\//);
      expect(m.settlementStation).toBeTruthy();
    }
  });
});

describe('buildTempBuckets', () => {
  it('centers the ladder on the forecast high', () => {
    const buckets = buildTempBuckets(91, 2, 5);
    expect(buckets.length).toBe(5);
    // Exactly one bucket should contain the forecast high.
    const containing = buckets.filter((b) => b.containsForecast);
    expect(containing.length).toBe(1);
    expect(containing[0].low).toBeLessThanOrEqual(91);
    expect(containing[0].high).toBeGreaterThanOrEqual(91);
  });

  it('produces contiguous 2-degree buckets centered on the forecast high', () => {
    // count=3 -> the forecast's bucket sits in the MIDDLE; base bucket for 80
    // is 80-81, so the ladder is 78-79 | 80-81 | 82-83.
    const buckets = buildTempBuckets(80, 2, 3);
    expect(buckets.map((b) => b.label)).toEqual([
      '78-79°F',
      '80-81°F',
      '82-83°F',
    ]);
    // The forecast high 80 lands in the middle bucket.
    expect(buckets[1].containsForecast).toBe(true);
    expect(buckets[0].containsForecast).toBe(false);
    expect(buckets[2].containsForecast).toBe(false);
  });

  it('returns empty for invalid input', () => {
    expect(buildTempBuckets(NaN)).toEqual([]);
    expect(buildTempBuckets(80, 0)).toEqual([]);
    expect(buildTempBuckets(80, 2, 0)).toEqual([]);
  });
});
