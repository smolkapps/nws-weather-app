import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildAlertsUrl,
  buildPointUrl,
  fetchWeatherBundle,
} from '../nwsClient';
import type { FetchLike } from '../nwsClient';

import pointFixture from '../fixtures/point.json';
import forecastFixture from '../fixtures/forecast.json';
import hourlyFixture from '../fixtures/hourly.json';
import observationFixture from '../fixtures/observation.json';
import stationsFixture from '../fixtures/stations.json';
import alertsFixture from '../fixtures/alerts.json';

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

/** Route a request URL to the right fixture, emulating the NWS endpoints. */
function makeRouter(overrides: Record<string, () => Promise<Response>> = {}): FetchLike {
  return vi.fn(async (url: string) => {
    for (const [needle, handler] of Object.entries(overrides)) {
      if (url.includes(needle)) return handler();
    }
    if (url.includes('/points/')) return json(pointFixture);
    if (url.includes('/forecast/hourly')) return json(hourlyFixture);
    if (url.includes('/forecast')) return json(forecastFixture);
    if (url.includes('/stations') && !url.includes('observations'))
      return json(stationsFixture);
    if (url.includes('/observations/latest')) return json(observationFixture);
    if (url.includes('/alerts/active')) return json(alertsFixture);
    throw new Error(`unexpected url in test: ${url}`);
  });
}

describe('URL builders', () => {
  it('rounds coordinates to 4 decimals for the points endpoint', () => {
    expect(buildPointUrl(40.71280123, -74.00601999)).toBe(
      'https://api.weather.gov/points/40.7128,-74.006',
    );
  });

  it('builds the alerts-by-point URL', () => {
    expect(buildAlertsUrl(40.7128, -74.006)).toBe(
      'https://api.weather.gov/alerts/active?point=40.7128,-74.006',
    );
  });
});

describe('fetchWeatherBundle', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('assembles location + forecast + current + alerts from the NWS flow', async () => {
    // The hourly fixture begins at 2026-06-21T14:00-04:00 and the bundle now
    // trims already-elapsed hours, so pin "now" to that first hour to keep the
    // assertion on the full 16-hour window deterministic (independent of the
    // machine's real clock). Fake only Date.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-21T14:00:00-04:00'));

    const fetchImpl = makeRouter();
    const bundle = await fetchWeatherBundle(40.7128, -74.006, fetchImpl);

    expect(bundle.location.gridId).toBe('OKX');
    expect(bundle.location.city).toBe('Hoboken');
    expect(bundle.forecast.length).toBe(14);
    expect(bundle.forecast[0].temperatureF).toBe(79);

    expect(bundle.hourly.length).toBe(16);
    expect(bundle.hourly[0].temperatureF).toBe(79);
    expect(bundle.hourly[0].startTime).toBe('2026-06-21T14:00:00-04:00');

    expect(bundle.current).not.toBeNull();
    expect(bundle.current?.temperatureF).toBe(80);
    expect(bundle.current?.windCardinal).toBe('WSW');

    expect(bundle.alerts.length).toBe(3);
    expect(bundle.alerts[0].severity).toBe('Severe');
  });

  it('still returns forecast when current conditions fail (best-effort)', async () => {
    const fetchImpl = makeRouter({
      '/observations/latest': async () =>
        new Response('boom', { status: 503, statusText: 'Unavailable' }),
    });
    const bundle = await fetchWeatherBundle(40.7128, -74.006, fetchImpl);
    expect(bundle.forecast.length).toBe(14);
    expect(bundle.current).toBeNull(); // degraded gracefully
    expect(bundle.alerts.length).toBe(3); // alerts still present
  });

  it('still returns forecast when alerts fail (best-effort)', async () => {
    const fetchImpl = makeRouter({
      '/alerts/active': async () =>
        new Response('boom', { status: 500, statusText: 'Error' }),
    });
    const bundle = await fetchWeatherBundle(40.7128, -74.006, fetchImpl);
    expect(bundle.forecast.length).toBe(14);
    expect(bundle.alerts).toEqual([]); // degraded gracefully
  });

  it('still returns forecast when the hourly forecast fails (best-effort)', async () => {
    const fetchImpl = makeRouter({
      '/forecast/hourly': async () =>
        new Response('boom', { status: 500, statusText: 'Error' }),
    });
    const bundle = await fetchWeatherBundle(40.7128, -74.006, fetchImpl);
    expect(bundle.forecast.length).toBe(14);
    expect(bundle.hourly).toEqual([]); // degraded gracefully
  });

  it('throws when the required points lookup fails', async () => {
    const fetchImpl = makeRouter({
      '/points/': async () =>
        new Response('nope', { status: 404, statusText: 'Not Found' }),
    });
    await expect(
      fetchWeatherBundle(0, 0, fetchImpl),
    ).rejects.toThrow(/NWS request failed: 404/);
  });
});
