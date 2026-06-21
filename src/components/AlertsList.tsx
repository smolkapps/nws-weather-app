import type { WeatherAlert } from '../lib/types';

interface Props {
  alerts: WeatherAlert[];
}

export function AlertsList({ alerts }: Props) {
  if (alerts.length === 0) return null;

  return (
    <section className="card" aria-label="Active weather alerts">
      <h2 className="section-title">
        Active alerts ({alerts.length})
      </h2>
      {alerts.map((a) => (
        <div className={`alert sev-${a.severity}`} key={a.id}>
          <div>
            <span className="event">{a.event}</span>
            <span className="badge">{a.severity}</span>
          </div>
          {a.areaDesc && <p className="area">{a.areaDesc}</p>}
        </div>
      ))}
    </section>
  );
}
