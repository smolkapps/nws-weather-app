import { describe, expect, it } from 'vitest';
import {
  firstStation,
  normalizeAlerts,
  normalizeForecast,
  normalizeHourly,
  normalizeObservation,
  normalizePoint,
} from '../normalize';
import type {
  NwsAlertsResponse,
  NwsForecastResponse,
  NwsObservationResponse,
  NwsPointResponse,
  NwsStationsResponse,
} from '../types';

import pointFixture from '../fixtures/point.json';
import forecastFixture from '../fixtures/forecast.json';
import hourlyFixture from '../fixtures/hourly.json';
import observationFixture from '../fixtures/observation.json';
import stationsFixture from '../fixtures/stations.json';
import alertsFixture from '../fixtures/alerts.json';

describe('normalizePoint', () => {
  it('maps a real /points response and echoes the requested coordinates', () => {
    const loc = normalizePoint(
      pointFixture as unknown as NwsPointResponse,
      40.7128,
      -74.006,
    );
    expect(loc.lat).toBe(40.7128);
    expect(loc.lon).toBe(-74.006);
    expect(loc.gridId).toBe('OKX');
    expect(loc.gridX).toBe(33);
    expect(loc.gridY).toBe(42);
    expect(loc.city).toBe('Hoboken');
    expect(loc.state).toBe('NJ');
    expect(loc.timeZone).toBe('America/New_York');
    expect(loc.forecastUrl).toContain('/gridpoints/OKX/33,42/forecast');
    expect(loc.stationsUrl).toContain('/stations');
  });
});

describe('normalizeForecast', () => {
  it('maps every period from a real forecast response', () => {
    const periods = normalizeForecast(
      forecastFixture as unknown as NwsForecastResponse,
    );
    expect(periods.length).toBe(14);

    const first = periods[0];
    expect(first.name).toBe('This Afternoon');
    expect(first.temperatureF).toBe(79);
    expect(first.isDaytime).toBe(true);
    expect(first.precipPercent).toBe(23);
    expect(first.shortForecast).toBe('Slight Chance Rain Showers');
    expect(first.windDirection).toBeTruthy();
  });

  it('converts Celsius forecast temps defensively', () => {
    const synthetic: NwsForecastResponse = {
      properties: {
        periods: [
          {
            number: 1,
            name: 'Test',
            startTime: '',
            endTime: '',
            isDaytime: true,
            temperature: 20,
            temperatureUnit: 'C',
            temperatureTrend: null,
            probabilityOfPrecipitation: { unitCode: 'percent', value: null },
            windSpeed: '5 mph',
            windDirection: 'N',
            icon: '',
            shortForecast: '',
            detailedForecast: '',
          },
        ],
      },
    };
    const periods = normalizeForecast(synthetic);
    expect(periods[0].temperatureF).toBe(68); // 20C -> 68F
    expect(periods[0].precipPercent).toBeNull();
  });

  it('handles an empty/missing periods array', () => {
    expect(
      normalizeForecast({ properties: { periods: [] } }),
    ).toEqual([]);
  });
});

describe('normalizeHourly', () => {
  // The fixture's first hour starts at 2026-06-21T14:00-04:00. Pin "now" to
  // that instant so nothing has elapsed yet and the full window is returned;
  // this keeps the mapping assertions deterministic instead of depending on
  // the machine's wall clock (which is what silently made the pre-fix version
  // "pass").
  const FIXTURE_FIRST_HOUR = new Date('2026-06-21T14:00:00-04:00');

  it('maps every hour from a real hourly response', () => {
    const hours = normalizeHourly(
      hourlyFixture as unknown as NwsForecastResponse,
      FIXTURE_FIRST_HOUR,
    );
    expect(hours.length).toBe(16);

    const first = hours[0];
    expect(first.number).toBe(1);
    expect(first.startTime).toBe('2026-06-21T14:00:00-04:00');
    expect(first.temperatureF).toBe(79);
    expect(first.isDaytime).toBe(true);
    expect(first.precipPercent).toBe(23);
    expect(first.shortForecast).toBe('Slight Chance Rain Showers');
  });

  // --- Regression: the hourly strip must start at the CURRENT hour ---
  // Pre-fix, normalizeHourly returned every period in the response verbatim,
  // so the strip led with already-elapsed hours (e.g. 2 PM when it was really
  // 5:30 PM). These pin a reference "now" partway through the fixture window
  // and assert the past is dropped and the in-progress hour comes first.
  it('drops fully-past hours and starts at the in-progress hour', () => {
    // 17:30 local (-04:00): hours 14/15/16 are done; the 17:00 hour is in
    // progress and must be the first one shown.
    const now = new Date('2026-06-21T17:30:00-04:00');
    const hours = normalizeHourly(
      hourlyFixture as unknown as NwsForecastResponse,
      now,
    );

    // 16 total in the fixture, 3 fully past (14,15,16) -> 13 remain.
    expect(hours.length).toBe(13);
    // First shown hour is the current/in-progress one, not the response head.
    expect(hours[0].number).toBe(4);
    expect(hours[0].startTime).toBe('2026-06-21T17:00:00-04:00');
    // No returned hour is fully in the past relative to "now".
    for (const h of hours) {
      expect(Date.parse(h.startTime)).toBeGreaterThan(
        now.getTime() - 3600_000,
      );
    }
    // The last fixture hour is still present (horizon is a display concern).
    expect(hours[hours.length - 1].startTime).toBe('2026-06-22T05:00:00-04:00');
  });

  it('keeps the exact-boundary hour as the current hour', () => {
    // Exactly on the top of the 16:00 hour: that hour is current, 14:00 and
    // 15:00 are past.
    const now = new Date('2026-06-21T16:00:00-04:00');
    const hours = normalizeHourly(
      hourlyFixture as unknown as NwsForecastResponse,
      now,
    );
    expect(hours[0].startTime).toBe('2026-06-21T16:00:00-04:00');
    expect(hours[0].number).toBe(3);
  });

  it('returns the whole window when now precedes the first hour', () => {
    const now = new Date('2026-06-21T09:00:00-04:00'); // before 14:00
    const hours = normalizeHourly(
      hourlyFixture as unknown as NwsForecastResponse,
      now,
    );
    expect(hours.length).toBe(16);
    expect(hours[0].startTime).toBe('2026-06-21T14:00:00-04:00');
  });

  it('returns only the last hour once now passes the final start', () => {
    const now = new Date('2026-06-22T04:30:00-04:00'); // inside the 04:00 hour
    const hours = normalizeHourly(
      hourlyFixture as unknown as NwsForecastResponse,
      now,
    );
    // 04:00 is in progress, 05:00 is future.
    expect(hours.map((h) => h.startTime)).toEqual([
      '2026-06-22T04:00:00-04:00',
      '2026-06-22T05:00:00-04:00',
    ]);
  });

  it('converts Celsius hourly temps defensively', () => {
    const synthetic: NwsForecastResponse = {
      properties: {
        periods: [
          {
            number: 1,
            name: '',
            startTime: '2026-06-21T14:00:00-04:00',
            endTime: '',
            isDaytime: true,
            temperature: 20,
            temperatureUnit: 'C',
            temperatureTrend: null,
            probabilityOfPrecipitation: { unitCode: 'percent', value: 10 },
            windSpeed: '5 mph',
            windDirection: 'N',
            icon: '',
            shortForecast: 'Clear',
            detailedForecast: '',
          },
        ],
      },
    };
    const hours = normalizeHourly(synthetic, FIXTURE_FIRST_HOUR);
    expect(hours[0].temperatureF).toBe(68); // 20C -> 68F
    expect(hours[0].precipPercent).toBe(10);
  });

  it('handles an empty/missing periods array', () => {
    expect(normalizeHourly({ properties: { periods: [] } })).toEqual([]);
  });
});

describe('normalizeObservation', () => {
  it('normalizes SI observation values to US units', () => {
    const cur = normalizeObservation(
      observationFixture as unknown as NwsObservationResponse,
      'KNYC',
      'New York Central Park',
    );
    expect(cur.stationId).toBe('KNYC');
    expect(cur.description).toBe('Partly Cloudy');
    expect(cur.temperatureF).toBe(80); // 26.7C
    expect(cur.humidityPercent).toBe(39); // 39.25%
    expect(cur.windSpeedMph).toBe(8); // 12.96 km/h
    expect(cur.windDirectionDeg).toBe(250);
    expect(cur.windCardinal).toBe('WSW');
  });
});

describe('firstStation', () => {
  it('returns the first station id and name', () => {
    const s = firstStation(stationsFixture as unknown as NwsStationsResponse);
    expect(s).not.toBeNull();
    expect(s?.id).toBe('KNYC');
    expect(s?.name).toBeTruthy();
  });

  it('returns null for no features', () => {
    expect(firstStation({ features: [] })).toBeNull();
  });
});

describe('normalizeAlerts', () => {
  it('normalizes and sorts real alerts by severity then onset', () => {
    const alerts = normalizeAlerts(
      alertsFixture as unknown as NwsAlertsResponse,
    );
    expect(alerts.length).toBe(3);
    // Fixture has 1 Moderate + 2 Severe; Severe must come first, and within
    // Severe the earlier onset must come first.
    expect(alerts[0].severity).toBe('Severe');
    expect(alerts[1].severity).toBe('Severe');
    expect(alerts[2].severity).toBe('Moderate');
    expect(Date.parse(alerts[0].onset!)).toBeLessThanOrEqual(
      Date.parse(alerts[1].onset!),
    );
  });

  it('coerces unknown severities and fills defaults', () => {
    const res: NwsAlertsResponse = {
      features: [
        {
          properties: {
            event: 'Mystery Event',
            severity: 'Weird',
            certainty: 'Possible',
            urgency: 'Future',
            headline: null,
            description: null,
            instruction: null,
            areaDesc: null,
            onset: null,
            expires: null,
          },
        },
      ],
    };
    const alerts = normalizeAlerts(res);
    expect(alerts[0].severity).toBe('Unknown');
    expect(alerts[0].headline).toBe('Mystery Event'); // falls back to event
    expect(alerts[0].id).toBe('alert-0');
  });

  it('handles empty features', () => {
    expect(normalizeAlerts({ features: [] })).toEqual([]);
  });
});
