import type { ForecastPeriod } from '../lib/types';
import { formatHourLabel, formatTempF } from '../lib/units';

interface Props {
  periods: ForecastPeriod[];
  timeZone: string;
  /** How many upcoming hours to show. Defaults to 12. */
  hours?: number;
}

export function HourlyForecast({ periods, timeZone, hours = 12 }: Props) {
  if (periods.length === 0) return null;

  const upcoming = periods.slice(0, hours);

  return (
    <section className="card" aria-label="Hourly forecast">
      <h2 className="section-title">Next {upcoming.length} hours</h2>
      <div className="hourly-row">
        {upcoming.map((p) => (
          <div className="hour" key={p.number}>
            <div className="hour-time">{formatHourLabel(p.startTime, timeZone)}</div>
            <div className="hour-temp">{formatTempF(p.temperatureF)}</div>
            <div className="hour-desc">{p.shortForecast}</div>
            {p.precipPercent !== null && p.precipPercent > 0 && (
              <div className="hour-pop">{p.precipPercent}%</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
