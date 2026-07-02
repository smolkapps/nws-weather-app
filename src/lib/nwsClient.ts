// NWS API client. Orchestrates the multi-step NWS flow:
//   /points/{lat},{lon}  ->  forecast + hourly + stations URLs
//   GET forecastUrl       ->  7-day periods
//   GET hourlyUrl         ->  hour-by-hour periods
//   GET stationsUrl       ->  first station id
//   GET station latest obs->  current conditions
//   /alerts/active?point  ->  active alerts
//
// All network goes through an injectable `fetch` so it can be tested with a
// stub. The NWS API requires a descriptive User-Agent.

import {
  firstStation,
  normalizeAlerts,
  normalizeForecast,
  normalizeHourly,
  normalizeObservation,
  normalizePoint,
} from './normalize';
import type {
  CurrentConditions,
  ForecastPeriod,
  HourlyPeriod,
  Location,
  NwsAlertsResponse,
  NwsForecastResponse,
  NwsObservationResponse,
  NwsPointResponse,
  NwsStationsResponse,
  WeatherAlert,
} from './types';

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

const NWS_BASE = 'https://api.weather.gov';

// NWS asks for a User-Agent that identifies the app and a contact. This is sent
// on every request. (Browsers ignore attempts to override User-Agent, but NWS
// also accepts requests without it; we still send it where the runtime allows.)
const USER_AGENT = 'nws-weather-app (github.com/smolkapps/nws-weather-app)';

const DEFAULT_HEADERS: Record<string, string> = {
  Accept: 'application/geo+json,application/ld+json,application/json',
  'User-Agent': USER_AGENT,
};

export interface WeatherBundle {
  location: Location;
  forecast: ForecastPeriod[];
  hourly: HourlyPeriod[];
  current: CurrentConditions | null;
  alerts: WeatherAlert[];
}

async function getJson<T>(url: string, fetchImpl: FetchLike): Promise<T> {
  const res = await fetchImpl(url, { headers: DEFAULT_HEADERS });
  if (!res.ok) {
    throw new Error(`NWS request failed: ${res.status} ${res.statusText} (${url})`);
  }
  return (await res.json()) as T;
}

/** Build the /points URL. NWS rejects more than 4 decimals of precision. */
export function buildPointUrl(lat: number, lon: number): string {
  const round = (n: number) => Math.round(n * 10000) / 10000;
  return `${NWS_BASE}/points/${round(lat)},${round(lon)}`;
}

export function buildAlertsUrl(lat: number, lon: number): string {
  const round = (n: number) => Math.round(n * 10000) / 10000;
  return `${NWS_BASE}/alerts/active?point=${round(lat)},${round(lon)}`;
}

export async function fetchLocation(
  lat: number,
  lon: number,
  fetchImpl: FetchLike = fetch,
): Promise<Location> {
  const data = await getJson<NwsPointResponse>(buildPointUrl(lat, lon), fetchImpl);
  return normalizePoint(data, lat, lon);
}

export async function fetchForecast(
  loc: Location,
  fetchImpl: FetchLike = fetch,
): Promise<ForecastPeriod[]> {
  const data = await getJson<NwsForecastResponse>(loc.forecastUrl, fetchImpl);
  return normalizeForecast(data);
}

export async function fetchHourly(
  loc: Location,
  fetchImpl: FetchLike = fetch,
): Promise<HourlyPeriod[]> {
  const data = await getJson<NwsForecastResponse>(loc.hourlyUrl, fetchImpl);
  return normalizeHourly(data);
}

export async function fetchCurrentConditions(
  loc: Location,
  fetchImpl: FetchLike = fetch,
): Promise<CurrentConditions | null> {
  const stations = await getJson<NwsStationsResponse>(loc.stationsUrl, fetchImpl);
  const station = firstStation(stations);
  if (!station) return null;
  const obsUrl = `${NWS_BASE}/stations/${station.id}/observations/latest`;
  const obs = await getJson<NwsObservationResponse>(obsUrl, fetchImpl);
  return normalizeObservation(obs, station.id, station.name);
}

export async function fetchAlerts(
  lat: number,
  lon: number,
  fetchImpl: FetchLike = fetch,
): Promise<WeatherAlert[]> {
  const data = await getJson<NwsAlertsResponse>(
    buildAlertsUrl(lat, lon),
    fetchImpl,
  );
  return normalizeAlerts(data);
}

/**
 * Fetch the full weather bundle for a coordinate. The forecast is required;
 * current conditions and alerts are best-effort (a station outage or an alerts
 * hiccup should not blank the whole page).
 */
export async function fetchWeatherBundle(
  lat: number,
  lon: number,
  fetchImpl: FetchLike = fetch,
): Promise<WeatherBundle> {
  const location = await fetchLocation(lat, lon, fetchImpl);

  const [forecast, hourly, current, alerts] = await Promise.all([
    fetchForecast(location, fetchImpl),
    fetchHourly(location, fetchImpl).catch(() => [] as HourlyPeriod[]),
    fetchCurrentConditions(location, fetchImpl).catch(() => null),
    fetchAlerts(lat, lon, fetchImpl).catch(() => [] as WeatherAlert[]),
  ]);

  return { location, forecast, hourly, current, alerts };
}
