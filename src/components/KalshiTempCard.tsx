import { buildTempBuckets, type KalshiTempMarket } from '../lib/kalshi';

interface Props {
  market: KalshiTempMarket;
  /** Today's forecast high in F, if known (used to highlight the bucket). */
  forecastHighF: number | null;
}

export function KalshiTempCard({ market, forecastHighF }: Props) {
  const buckets =
    forecastHighF !== null ? buildTempBuckets(forecastHighF, 2, 5) : [];

  return (
    <section className="card kalshi-card" aria-label="Kalshi temperature market">
      <h3>{market.city} temperature market on Kalshi</h3>
      <p className="lede">
        Kalshi lists a daily "highest temperature in {market.city}" event
        contract (series {market.seriesTicker}) that settles on the official
        NWS daily high at {market.settlementStation} — the same reading shown
        above.
      </p>

      {forecastHighF !== null && buckets.length > 0 && (
        <>
          <p className="lede" style={{ marginBottom: '0.25rem' }}>
            Today's NWS forecast high of <strong>{forecastHighF}°F</strong> lands
            in this temperature bucket:
          </p>
          <div className="bucket-ladder">
            {buckets.map((b) => (
              <span
                className={`bucket${b.containsForecast ? ' hit' : ''}`}
                key={b.label}
              >
                {b.label}
              </span>
            ))}
          </div>
        </>
      )}

      <a
        className="kalshi-link"
        href={market.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        View the {market.city} temperature market on Kalshi →
      </a>

      <p className="disclaimer">
        Reference only. This app does not quote live Kalshi prices and is not
        affiliated with Kalshi. Markets involve risk; nothing here is financial
        advice.
      </p>
    </section>
  );
}
