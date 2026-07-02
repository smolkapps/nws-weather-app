import { useState } from 'react';
import type { HourlyPeriod } from '../lib/types';
import { formatHourLabel, formatTempF } from '../lib/units';

interface Props {
  periods: HourlyPeriod[];
  /** IANA time zone of the location, so hours render in local wall-clock. */
  timeZone?: string;
  /** How many upcoming hours to show. */
  hours?: number;
}

export function HourlyForecast({ periods, timeZone, hours = 12 }: Props) {
  const [open, setOpen] = useState(false);

  if (periods.length === 0) return null;

  // Drop hours that have already fully elapsed, so an expand long after load
  // still shows the *next* hours rather than a stale window starting in the
  // past. Computed at render time; toggling re-evaluates against the clock.
  const now = Date.now();
  const upcoming = periods
    .filter((h) => Date.parse(h.endTime) > now)
    .slice(0, hours);

  if (upcoming.length === 0) return null;

  return (
    <section className="card" aria-label="Hourly forecast">
      <button
        type="button"
        className="hourly-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="section-title">Hourly forecast</span>
        <span className="hourly-chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="hourly-strip" role="list">
          {upcoming.map((h) => (
            <div className="hour" role="listitem" key={h.number}>
              <div className="hour-time">
                {formatHourLabel(h.startTime, timeZone)}
              </div>
              {h.icon && (
                <img className="hour-icon" src={h.icon} alt="" aria-hidden />
              )}
              <div className="hour-temp">{formatTempF(h.temperatureF)}</div>
              {h.precipPercent !== null && h.precipPercent > 0 && (
                <div className="hour-pop">{h.precipPercent}%</div>
              )}
              <div className="hour-desc">{h.shortForecast}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
