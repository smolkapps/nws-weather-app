import { describe, expect, it } from 'vitest';
import { buildDemoBundle, DEMO_LOCATION_LABEL } from '../demo';
import { findKalshiTempMarket } from '../kalshi';

describe('buildDemoBundle', () => {
  it('builds a complete bundle from the committed fixtures with no network', () => {
    const bundle = buildDemoBundle();

    expect(bundle.location.city).toBe('New York');
    expect(bundle.location.state).toBe('NY');
    expect(DEMO_LOCATION_LABEL).toBe('New York, NY');

    expect(bundle.forecast.length).toBeGreaterThan(0);
    expect(bundle.current).not.toBeNull();
    expect(bundle.alerts.length).toBeGreaterThan(0);
  });

  it('keeps the full hourly strip by anchoring to the fixture time, not the wall clock', () => {
    const bundle = buildDemoBundle();
    // The fixture window is in the past; without the anchor every hour but the
    // last would be dropped and the strip would be useless.
    expect(bundle.hourly.length).toBeGreaterThan(1);
  });

  it('represents a city with a Kalshi market so the card is demonstrated too', () => {
    const bundle = buildDemoBundle();
    expect(
      findKalshiTempMarket(bundle.location.city, bundle.location.state),
    ).not.toBeNull();
  });

  it('sorts demo alerts by severity like the live path', () => {
    const bundle = buildDemoBundle();
    const ranks = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3, Unknown: 4 };
    const order = bundle.alerts.map((a) => ranks[a.severity]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});
