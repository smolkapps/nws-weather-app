import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { App } from '../App';

import pointFixture from '../lib/fixtures/point.json';
import forecastFixture from '../lib/fixtures/forecast.json';
import hourlyFixture from '../lib/fixtures/hourly.json';
import observationFixture from '../lib/fixtures/observation.json';
import stationsFixture from '../lib/fixtures/stations.json';
import alertsFixture from '../lib/fixtures/alerts.json';

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

// A point response whose relative location is "New York, NY" so the Kalshi
// card renders. We clone the real fixture and override the city/state.
const nycPoint = structuredClone(pointFixture) as typeof pointFixture;
nycPoint.properties.relativeLocation.properties.city = 'New York';
nycPoint.properties.relativeLocation.properties.state = 'NY';

function installFetchMock() {
  const impl = vi.fn(async (url: string) => {
    if (url.includes('geocoding.geo.census.gov')) {
      return json({
        result: {
          addressMatches: [
            {
              matchedAddress: 'NEW YORK, NY',
              coordinates: { x: -74.006, y: 40.7128 },
            },
          ],
        },
      });
    }
    if (url.includes('/points/')) return json(nycPoint);
    if (url.includes('/forecast/hourly')) return json(hourlyFixture);
    if (url.includes('/forecast')) return json(forecastFixture);
    if (url.includes('/stations') && !url.includes('observations'))
      return json(stationsFixture);
    if (url.includes('/observations/latest')) return json(observationFixture);
    if (url.includes('/alerts/active')) return json(alertsFixture);
    throw new Error(`unexpected url: ${url}`);
  });
  vi.stubGlobal('fetch', impl);
  return impl;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('<App /> end to end (mocked fetch)', () => {
  it('loads the default location and renders forecast, conditions, alerts, and Kalshi card', async () => {
    installFetchMock();
    render(<App />);

    // Current conditions header (location title) appears once data loads.
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: /New York, NY/i }),
      ).toBeInTheDocument(),
    );

    // Current temperature from the observation fixture (26.7C -> 80F). Scope to
    // the current-conditions region; "80°F" can appear more than once there
    // (the big temp plus the heat-index metric), so assert it is present.
    const currentRegion = screen.getByRole('region', {
      name: /Current conditions/i,
    });
    expect(within(currentRegion).getAllByText('80°F').length).toBeGreaterThan(0);
    // The big current temperature specifically renders "80°F".
    expect(currentRegion.querySelector('.current-temp')?.textContent).toBe(
      '80°F',
    );

    // Forecast section renders periods.
    expect(
      screen.getByRole('region', { name: /Multi-day forecast/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('This Afternoon')).toBeInTheDocument();

    // Alerts surfaced (fixture has 3).
    expect(screen.getByText(/Active alerts \(3\)/i)).toBeInTheDocument();

    // Kalshi card present for New York (scope to the heading to avoid matching
    // the link text, which contains the same phrase).
    expect(
      screen.getByRole('heading', {
        name: /New York temperature market on Kalshi/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: /View the New York temperature market on Kalshi/i,
      }),
    ).toBeInTheDocument();
  });

  it('reveals the hourly strip starting at the current hour, past hours dropped', async () => {
    // Pin "now" to 5:30 PM local (-04:00), partway through the fixture's
    // window (which begins at 2 PM). Anchoring to a known "now" instead of the
    // real wall clock is what makes this deterministic — and 5:30 PM (NOT the
    // fixture's first hour) is what turns this into a real regression guard:
    // the strip must START at the in-progress 5 PM hour and the elapsed
    // 2/3/4 PM hours must be gone. The pre-fix code led with "2 PM" here, so
    // this test fails on the bug. Fake only Date so waitFor/findBy timers run.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-21T17:30:00-04:00'));

    installFetchMock();
    render(<App />);

    const region = await screen.findByRole('region', {
      name: /Hourly forecast/i,
    });

    // Collapsed by default: the toggle exists but the hours are hidden.
    const toggle = within(region).getByRole('button', { name: /Hourly forecast/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(region).queryByRole('list')).not.toBeInTheDocument();

    // Expand it: the hour strip appears and starts at the CURRENT hour.
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(region).getByRole('list')).toBeInTheDocument();

    // The first rendered hour label is the in-progress 5 PM hour (17:00 -04:00
    // in New York), not the response's first period.
    const labels = within(region)
      .getAllByRole('listitem')
      .map((li) => li.querySelector('.hour-time')?.textContent);
    expect(labels[0]).toBe('5 PM');
    // Already-elapsed hours must not appear at all.
    expect(within(region).queryByText('2 PM')).not.toBeInTheDocument();
    expect(within(region).queryByText('3 PM')).not.toBeInTheDocument();
    expect(within(region).queryByText('4 PM')).not.toBeInTheDocument();
  });

  it('shows an error when geocoding finds nothing', async () => {
    const impl = vi.fn(async (url: string) => {
      if (url.includes('geocoding.geo.census.gov')) {
        return json({ result: { addressMatches: [] } });
      }
      throw new Error(`unexpected url: ${url}`);
    });
    vi.stubGlobal('fetch', impl);

    render(<App />);
    await waitFor(() =>
      expect(screen.getByText(/Could not find/i)).toBeInTheDocument(),
    );
  });

  it('falls back to bundled sample data when the initial load cannot reach the network', async () => {
    // fetch() rejecting models being fully offline.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

    render(<App />);

    // The sample banner appears and the fixture forecast renders — the app
    // stays fully usable offline, with zero network and zero API keys.
    await waitFor(() =>
      expect(screen.getByText('Sample data.')).toBeInTheDocument(),
    );
    expect(
      screen.getByRole('heading', { name: /New York, NY/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /Multi-day forecast/i }),
    ).toBeInTheDocument();
  });

  it('offers sample data from the error state after a failed search', async () => {
    installFetchMock();
    render(<App />);
    await screen.findByRole('heading', { name: /New York, NY/i });

    // Subsequent searches hit a dead network.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Denver, CO' },
    });
    fireEvent.click(screen.getByRole('button', { name: /get forecast/i }));

    await screen.findByRole('alert');
    expect(
      screen.getByText(/could not reach the weather service/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /view sample data/i }));
    expect(await screen.findByText('Sample data.')).toBeInTheDocument();
  });
});
