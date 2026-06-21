import type { ForecastPeriod } from './types';

/**
 * The "high temperature for today" used to anchor the Kalshi bucket ladder is
 * the temperature of the first daytime period (NWS labels the current daytime
 * period e.g. "Today" / "This Afternoon"). If there is no daytime period left
 * today (i.e. it is already night), fall back to the first period's temp, then
 * null.
 */
export function todaysHighF(periods: ForecastPeriod[]): number | null {
  const daytime = periods.find((p) => p.isDaytime);
  if (daytime) return daytime.temperatureF;
  if (periods.length > 0) return periods[0].temperatureF;
  return null;
}
