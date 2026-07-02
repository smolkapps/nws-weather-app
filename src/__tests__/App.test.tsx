import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { App } from '../App';
import { HourlyForecast } from '../components/HourlyForecast';

import pointFixture from '../lib/__tests__/fixtures/point.json';
import forecastFixture from '../lib/__tests__/fixtures/forecast.json';
import hourlyFixture from '../lib/__tests__/fixtures/hourly.json';
import observationFixture from '../lib/__tests__/fixtures/observation.json';
import stationsFixture from '../lib/__tests__/fixtures/stations.json';
import alertsFixture from '../lib/__tests__/fixtures/alerts.json';

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

// The hourly strip filters out elapsed hours via Date.now(), and the fixture is
// anchored to a fixed wall-clock. Pin "now" just before the first hour so the
// whole 16-period fixture is upcoming and the tests stay deterministic. This
// spies only on Date.now (not timers), so testing-library's async helpers work.
const FIXED_NOW = Date.parse('2026-06-21T13:00:00-04:00');

function installFetchMock() {
  vi.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
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

  it('reveals the hourly strip when the toggle is expanded', async () => {
    installFetchMock();
    render(<App />);

    const region = await screen.findByRole('region', {
      name: /Hourly forecast/i,
    });

    // Collapsed by default: the toggle exists but the hours are hidden.
    const toggle = within(region).getByRole('button', { name: /Hourly forecast/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(region).queryByRole('list')).not.toBeInTheDocument();

    // Expand it: the hour strip and the first hour's local label appear.
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(region).getByRole('list')).toBeInTheDocument();
    // 14:00 -04:00 in New York renders as "2 PM".
    expect(within(region).getByText('2 PM')).toBeInTheDocument();
  });

  it('caps the hourly strip at 12 hours even though the fixture has 16', async () => {
    installFetchMock();
    render(<App />);

    const region = await screen.findByRole('region', {
      name: /Hourly forecast/i,
    });
    fireEvent.click(
      within(region).getByRole('button', { name: /Hourly forecast/i }),
    );

    // The fixture carries 16 upcoming periods (all after FIXED_NOW), but the
    // strip renders at most `hours` (default 12) list items.
    expect(within(region).getAllByRole('listitem')).toHaveLength(12);
  });

  it('renders nothing when there are no hourly periods', () => {
    const { container } = render(
      <HourlyForecast periods={[]} timeZone="America/New_York" />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(
      screen.queryByRole('region', { name: /Hourly forecast/i }),
    ).not.toBeInTheDocument();
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
});
