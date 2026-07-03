// Pure functions that map raw NWS API response shapes into our normalized
// domain types. No network here — everything is testable against fixtures.

import type {
  AlertSeverity,
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
import {
  celsiusToFahrenheit,
  degreesToCardinal,
  kmhToMph,
  roundPercent,
} from './units';

const KNOWN_SEVERITIES: AlertSeverity[] = [
  'Extreme',
  'Severe',
  'Moderate',
  'Minor',
  'Unknown',
];

/** Sort weight: lower number = more urgent. Used for ordering alerts. */
const SEVERITY_RANK: Record<AlertSeverity, number> = {
  Extreme: 0,
  Severe: 1,
  Moderate: 2,
  Minor: 3,
  Unknown: 4,
};

function coerceSeverity(raw: string | undefined | null): AlertSeverity {
  if (raw && (KNOWN_SEVERITIES as string[]).includes(raw)) {
    return raw as AlertSeverity;
  }
  return 'Unknown';
}

/**
 * Round-trip the lat/lon back out of a point request. The NWS `/points`
 * response does not echo the request coordinates in a stable field, so the
 * caller passes them in.
 */
export function normalizePoint(
  res: NwsPointResponse,
  lat: number,
  lon: number,
): Location {
  const p = res.properties;
  return {
    lat,
    lon,
    city: p.relativeLocation?.properties?.city ?? 'Unknown',
    state: p.relativeLocation?.properties?.state ?? '',
    gridId: p.gridId,
    gridX: p.gridX,
    gridY: p.gridY,
    forecastUrl: p.forecast,
    hourlyUrl: p.forecastHourly,
    stationsUrl: p.observationStations,
    timeZone: p.timeZone,
  };
}

function precipFromPeriod(
  prob: NwsForecastResponse['properties']['periods'][number]['probabilityOfPrecipitation'],
): number | null {
  if (!prob) return null;
  return roundPercent(prob.value);
}

export function normalizeForecast(res: NwsForecastResponse): ForecastPeriod[] {
  const periods = res.properties?.periods ?? [];
  return periods.map((period) => ({
    number: period.number,
    name: period.name,
    startTime: period.startTime,
    endTime: period.endTime,
    isDaytime: period.isDaytime,
    // Forecast endpoint already returns Fahrenheit for US locations, but be
    // defensive: convert if it ever reports Celsius.
    temperatureF:
      period.temperatureUnit === 'C'
        ? celsiusToFahrenheit(period.temperature) ?? period.temperature
        : period.temperature,
    temperatureTrend: period.temperatureTrend,
    precipPercent: precipFromPeriod(period.probabilityOfPrecipitation),
    windSpeed: period.windSpeed,
    windDirection: period.windDirection,
    icon: period.icon,
    shortForecast: period.shortForecast,
    detailedForecast: period.detailedForecast,
  }));
}

/**
 * Normalize the hourly forecast endpoint. Same GeoJSON shape as the multi-day
 * forecast, but each period is a single hour. We keep only the fields the
 * hourly strip renders and, like the daily forecast, defensively convert
 * Celsius should the API ever report it.
 *
 * The NWS hourly response starts at the top of the *current* hour and runs
 * ~156 hours out, so the raw array contains hours that have already elapsed.
 * We anchor to `now` and drop fully-past hours, keeping the in-progress hour
 * plus every future hour — so the strip always starts at the current/next
 * hour rather than at whatever the response happened to begin with.
 *
 * `now` is injectable purely so tests can pin the clock; production callers
 * use the real wall clock. The boundary is derived from each period's
 * `startTime` only (the current hour is the latest period whose `startTime`
 * is <= now), so a malformed/missing `endTime` can't cause an hour to be
 * dropped. Each `startTime` carries its own UTC offset, so `Date.parse`
 * yields a correct absolute instant regardless of the viewer's zone.
 *
 * Assumes the response periods are in ascending time order, which the NWS
 * hourly feed guarantees (and which `normalizeForecast` already relies on).
 */
export function normalizeHourly(
  res: NwsForecastResponse,
  now: Date = new Date(),
): HourlyPeriod[] {
  const periods = res.properties?.periods ?? [];
  const nowMs = now.getTime();

  // Index of the current (in-progress) hour: the last period that has already
  // started. Everything before it is fully in the past; everything from it
  // onward is current-or-future. -1 means every period is still in the future.
  let currentIdx = -1;
  for (let i = 0; i < periods.length; i += 1) {
    const startMs = Date.parse(periods[i].startTime);
    if (!Number.isNaN(startMs) && startMs <= nowMs) {
      currentIdx = i;
    }
  }
  const start = currentIdx < 0 ? 0 : currentIdx;

  return periods.slice(start).map((period) => ({
    number: period.number,
    startTime: period.startTime,
    isDaytime: period.isDaytime,
    temperatureF:
      period.temperatureUnit === 'C'
        ? celsiusToFahrenheit(period.temperature) ?? period.temperature
        : period.temperature,
    precipPercent: precipFromPeriod(period.probabilityOfPrecipitation),
    windSpeed: period.windSpeed,
    windDirection: period.windDirection,
    icon: period.icon,
    shortForecast: period.shortForecast,
  }));
}

export function normalizeObservation(
  res: NwsObservationResponse,
  stationId: string,
  stationName: string,
): CurrentConditions {
  const p = res.properties;
  const windDirDeg = p.windDirection?.value ?? null;
  return {
    stationId,
    stationName,
    timestamp: p.timestamp,
    description: p.textDescription ?? '',
    temperatureF: celsiusToFahrenheit(p.temperature?.value),
    dewpointF: celsiusToFahrenheit(p.dewpoint?.value),
    humidityPercent: roundPercent(p.relativeHumidity?.value),
    windSpeedMph: kmhToMph(p.windSpeed?.value),
    windDirectionDeg: windDirDeg,
    windCardinal: degreesToCardinal(windDirDeg),
    heatIndexF: celsiusToFahrenheit(p.heatIndex?.value),
    windChillF: celsiusToFahrenheit(p.windChill?.value),
    icon: p.icon,
  };
}

/** Pick the first observation station identifier + name, if any. */
export function firstStation(
  res: NwsStationsResponse,
): { id: string; name: string } | null {
  const feat = res.features?.[0];
  if (!feat) return null;
  return {
    id: feat.properties.stationIdentifier,
    name: feat.properties.name,
  };
}

/**
 * Normalize active alerts and sort them by severity (most urgent first),
 * then by onset time (soonest first). Defensive against missing fields.
 */
export function normalizeAlerts(res: NwsAlertsResponse): WeatherAlert[] {
  const features = res.features ?? [];
  const alerts: WeatherAlert[] = features.map((f, i) => {
    const p = f.properties;
    return {
      id: p.id ?? `alert-${i}`,
      event: p.event ?? 'Weather Alert',
      severity: coerceSeverity(p.severity),
      headline: p.headline ?? p.event ?? 'Weather Alert',
      description: p.description ?? '',
      instruction: p.instruction ?? null,
      areaDesc: p.areaDesc ?? '',
      onset: p.onset ?? null,
      expires: p.expires ?? null,
    };
  });

  return alerts.sort((a, b) => {
    const rank = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (rank !== 0) return rank;
    const at = a.onset ? Date.parse(a.onset) : Number.MAX_SAFE_INTEGER;
    const bt = b.onset ? Date.parse(b.onset) : Number.MAX_SAFE_INTEGER;
    return at - bt;
  });
}

export { SEVERITY_RANK };
