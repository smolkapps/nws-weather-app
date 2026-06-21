import type { CurrentConditions, Location } from '../lib/types';
import { formatTempF, formatPercent } from '../lib/units';

interface Props {
  location: Location;
  current: CurrentConditions | null;
}

function formatObsTime(iso: string, timeZone: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      timeZone,
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function CurrentConditionsCard({ location, current }: Props) {
  return (
    <section className="card" aria-label="Current conditions">
      <h2 className="location-title">
        {location.city}
        {location.state ? `, ${location.state}` : ''}
      </h2>
      <p className="location-sub">
        NWS office {location.gridId} · grid {location.gridX},{location.gridY}
      </p>

      {current ? (
        <>
          <div className="current-grid" style={{ marginTop: '0.75rem' }}>
            <div className="current-temp">{formatTempF(current.temperatureF)}</div>
            <div>
              <div className="current-desc">{current.description || '—'}</div>
              <div className="location-sub">
                {current.stationName} ({current.stationId}) ·{' '}
                {formatObsTime(current.timestamp, location.timeZone)}
              </div>
            </div>
          </div>

          <div className="metrics">
            <div className="metric">
              <span className="label">Humidity</span>
              <span className="value">{formatPercent(current.humidityPercent)}</span>
            </div>
            <div className="metric">
              <span className="label">Dew point</span>
              <span className="value">{formatTempF(current.dewpointF)}</span>
            </div>
            <div className="metric">
              <span className="label">Wind</span>
              <span className="value">
                {current.windSpeedMph !== null
                  ? `${current.windSpeedMph} mph${
                      current.windCardinal ? ` ${current.windCardinal}` : ''
                    }`
                  : '--'}
              </span>
            </div>
            {current.heatIndexF !== null && (
              <div className="metric">
                <span className="label">Heat index</span>
                <span className="value">{formatTempF(current.heatIndexF)}</span>
              </div>
            )}
            {current.windChillF !== null && (
              <div className="metric">
                <span className="label">Wind chill</span>
                <span className="value">{formatTempF(current.windChillF)}</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="status">
          Current conditions are unavailable for this location right now.
        </p>
      )}
    </section>
  );
}
