import { describe, expect, it } from 'vitest';
import { todaysHighF } from '../forecast';
import { normalizeForecast } from '../normalize';
import type { ForecastPeriod, NwsForecastResponse } from '../types';
import forecastFixture from '../fixtures/forecast.json';

function period(over: Partial<ForecastPeriod>): ForecastPeriod {
  return {
    number: 1,
    name: 'P',
    startTime: '',
    endTime: '',
    isDaytime: true,
    temperatureF: 70,
    temperatureTrend: null,
    precipPercent: null,
    windSpeed: '',
    windDirection: '',
    icon: '',
    shortForecast: '',
    detailedForecast: '',
    ...over,
  };
}

describe('todaysHighF', () => {
  it('returns the first daytime period temperature', () => {
    const periods = [
      period({ number: 1, isDaytime: false, temperatureF: 55 }),
      period({ number: 2, isDaytime: true, temperatureF: 88 }),
    ];
    expect(todaysHighF(periods)).toBe(88);
  });

  it('falls back to the first period when no daytime period exists', () => {
    const periods = [
      period({ number: 1, isDaytime: false, temperatureF: 50 }),
      period({ number: 2, isDaytime: false, temperatureF: 48 }),
    ];
    expect(todaysHighF(periods)).toBe(50);
  });

  it('returns null for no periods', () => {
    expect(todaysHighF([])).toBeNull();
  });

  it('works on the real fixture (first period is daytime, 79F)', () => {
    const periods = normalizeForecast(
      forecastFixture as unknown as NwsForecastResponse,
    );
    expect(todaysHighF(periods)).toBe(79);
  });
});
