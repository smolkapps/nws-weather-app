import type { ForecastPeriod } from '../lib/types';
import { formatTempF } from '../lib/units';

interface Props {
  periods: ForecastPeriod[];
}

export function ForecastList({ periods }: Props) {
  if (periods.length === 0) {
    return (
      <section className="card">
        <h2 className="section-title">Forecast</h2>
        <p className="status">No forecast periods available.</p>
      </section>
    );
  }

  return (
    <section className="card" aria-label="Multi-day forecast">
      <h2 className="section-title">Forecast</h2>
      <div className="forecast-list">
        {periods.map((p) => (
          <div className="period" key={p.number}>
            <div>
              <div className="name">{p.name}</div>
              {p.precipPercent !== null && p.precipPercent > 0 && (
                <div className="pop">{p.precipPercent}% precip</div>
              )}
            </div>
            <div className="detail">
              {p.shortForecast}
              {p.windSpeed && (
                <span className="wind">
                  {' '}
                  · Wind {p.windDirection ? `${p.windDirection} ` : ''}
                  {p.windSpeed}
                </span>
              )}
            </div>
            <div className="temp">
              {formatTempF(p.temperatureF)}
              {p.temperatureTrend ? (
                <span className="pop"> {p.temperatureTrend}</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
