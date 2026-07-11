import type { WeatherAlert } from '../lib/types';

interface Props {
  alerts: WeatherAlert[];
  /** IANA time zone of the location, for onset/expiry times. */
  timeZone?: string;
}

function formatAlertTime(iso: string | null, timeZone?: string): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  try {
    return new Date(t).toLocaleString('en-US', {
      timeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

export function AlertsList({ alerts, timeZone }: Props) {
  if (alerts.length === 0) return null;

  return (
    <section className="card" aria-label="Active weather alerts">
      <h2 className="section-title">Active alerts ({alerts.length})</h2>
      {alerts.map((a) => {
        const until = formatAlertTime(a.expires, timeZone);
        return (
          <details className={`alert sev-${a.severity}`} key={a.id}>
            <summary>
              <span className="event">{a.event}</span>
              <span className="badge">{a.severity}</span>
              {until && <span className="alert-until">until {until}</span>}
            </summary>
            <div className="alert-body">
              {a.headline && a.headline !== a.event && (
                <p className="alert-headline">{a.headline}</p>
              )}
              {a.areaDesc && <p className="area">Areas: {a.areaDesc}</p>}
              {a.description && <p className="alert-desc">{a.description}</p>}
              {a.instruction && (
                <p className="alert-instruction">
                  <strong>What to do:</strong> {a.instruction}
                </p>
              )}
            </div>
          </details>
        );
      })}
      <p className="alerts-hint">Select an alert for details and safety instructions.</p>
    </section>
  );
}
