// Pure unit-conversion + formatting helpers.
// NWS observations come in SI (degC, km/h, Pa, m); the forecast endpoint
// returns US units (degF, mph strings). We normalize everything to US units
// for display since this is a US-only service.

/** Celsius -> Fahrenheit, rounded to the nearest integer. Null-safe. */
export function celsiusToFahrenheit(c: number | null | undefined): number | null {
  if (c === null || c === undefined || Number.isNaN(c)) return null;
  return Math.round((c * 9) / 5 + 32);
}

/** Kilometers/hour -> miles/hour, rounded to the nearest integer. Null-safe. */
export function kmhToMph(kmh: number | null | undefined): number | null {
  if (kmh === null || kmh === undefined || Number.isNaN(kmh)) return null;
  return Math.round(kmh * 0.621371);
}

/** Meters -> statute miles, rounded to one decimal. Null-safe. */
export function metersToMiles(m: number | null | undefined): number | null {
  if (m === null || m === undefined || Number.isNaN(m)) return null;
  return Math.round((m * 0.000621371) * 10) / 10;
}

/** Pascals -> inches of mercury, rounded to two decimals. Null-safe. */
export function pascalsToInHg(pa: number | null | undefined): number | null {
  if (pa === null || pa === undefined || Number.isNaN(pa)) return null;
  return Math.round(pa * 0.0002953 * 100) / 100;
}

const CARDINALS = [
  'N', 'NNE', 'NE', 'ENE',
  'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW',
  'W', 'WNW', 'NW', 'NNW',
];

/**
 * Convert a compass bearing in degrees (0..360, 0 = North, clockwise) into a
 * 16-point cardinal direction string. Null-safe; normalizes out-of-range input.
 */
export function degreesToCardinal(deg: number | null | undefined): string | null {
  if (deg === null || deg === undefined || Number.isNaN(deg)) return null;
  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return CARDINALS[index];
}

/** Round a humidity-like percent to a whole number, clamped to 0..100. Null-safe. */
export function roundPercent(p: number | null | undefined): number | null {
  if (p === null || p === undefined || Number.isNaN(p)) return null;
  return Math.min(100, Math.max(0, Math.round(p)));
}

/** Format a Fahrenheit value for display, e.g. 72 -> "72°F". Null -> "--". */
export function formatTempF(f: number | null | undefined): string {
  if (f === null || f === undefined || Number.isNaN(f)) return '--';
  return `${Math.round(f)}°F`;
}

/** Format a percent for display, e.g. 30 -> "30%". Null -> "--". */
export function formatPercent(p: number | null | undefined): string {
  if (p === null || p === undefined || Number.isNaN(p)) return '--';
  return `${Math.round(p)}%`;
}
