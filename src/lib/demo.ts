// Sample-data mode: a full WeatherBundle built from the committed NWS fixtures
// (the same ones the test suite runs against). This is what the app falls back
// to when the network is unreachable, so every feature keeps working offline
// with zero API keys and zero external requests.

import pointFixture from './fixtures/point.json';
import forecastFixture from './fixtures/forecast.json';
import hourlyFixture from './fixtures/hourly.json';
import observationFixture from './fixtures/observation.json';
import stationsFixture from './fixtures/stations.json';
import alertsFixture from './fixtures/alerts.json';
import {
  firstStation,
  normalizeAlerts,
  normalizeForecast,
  normalizeHourly,
  normalizeObservation,
  normalizePoint,
} from './normalize';
import type {
  NwsAlertsResponse,
  NwsForecastResponse,
  NwsObservationResponse,
  NwsPointResponse,
  NwsStationsResponse,
} from './types';
import type { WeatherBundle } from './nwsClient';

/** The location the sample bundle represents, for banners and labels. */
export const DEMO_LOCATION_LABEL = 'New York, NY';

export function buildDemoBundle(): WeatherBundle {
  // The fixture's relative location is a nearby suburb; pin it to the city the
  // data actually describes (KNYC / Central Park) so labels read correctly.
  const point = structuredClone(pointFixture) as unknown as NwsPointResponse;
  point.properties.relativeLocation.properties.city = 'New York';
  point.properties.relativeLocation.properties.state = 'NY';
  const location = normalizePoint(point, 40.7128, -74.006);

  const forecast = normalizeForecast(
    forecastFixture as unknown as NwsForecastResponse,
  );

  // Anchor "now" to the fixture's own first hour: the saved data is a frozen
  // moment in time, so filtering it against the real wall clock would discard
  // every hour. Epoch 0 keeps the whole strip if the fixture is ever empty.
  const hourlyRes = hourlyFixture as unknown as NwsForecastResponse;
  const firstStart = hourlyRes.properties.periods[0]?.startTime;
  const hourly = normalizeHourly(
    hourlyRes,
    firstStart ? new Date(firstStart) : new Date(0),
  );

  const station = firstStation(stationsFixture as unknown as NwsStationsResponse);
  const current = station
    ? normalizeObservation(
        observationFixture as unknown as NwsObservationResponse,
        station.id,
        station.name,
      )
    : null;

  const alerts = normalizeAlerts(alertsFixture as unknown as NwsAlertsResponse);

  return { location, forecast, hourly, current, alerts };
}
