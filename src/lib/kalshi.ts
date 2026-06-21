// Kalshi temperature-market reference logic.
//
// Kalshi (kalshi.com) lists daily "highest temperature" event contracts for a
// handful of U.S. cities. These markets settle on the official NWS/NOAA daily
// high at a specific station, which is exactly the data this app already shows.
// We surface a contextual reference on matching city pages so a user looking at
// the NWS high for, say, NYC can see that a corresponding tradable market
// exists. This also captures "Kalshi temperature" / "<city> temperature market"
// search intent.
//
// IMPORTANT: We do NOT fetch live Kalshi prices or quote odds. We only map a
// location to the relevant market series and link out. No financial advice.

export interface KalshiTempMarket {
  /** Kalshi series ticker for the daily-high market, e.g. "KXHIGHNY". */
  seriesTicker: string;
  /** Human label for the city the market settles on. */
  city: string;
  state: string;
  /** The NWS/NOAA station the contract settles against. */
  settlementStation: string;
  /** Canonical URL to the market series on Kalshi. */
  url: string;
}

// Series tickers follow Kalshi's "highest temperature in <city>" markets.
// These are stable identifiers; we link to the series page rather than a
// single daily event so the link stays valid day to day.
const MARKETS: KalshiTempMarket[] = [
  {
    seriesTicker: 'KXHIGHNY',
    city: 'New York',
    state: 'NY',
    settlementStation: 'Central Park (KNYC)',
    url: 'https://kalshi.com/markets/kxhighny/highest-temperature-in-nyc',
  },
  {
    seriesTicker: 'KXHIGHCHI',
    city: 'Chicago',
    state: 'IL',
    settlementStation: "Chicago Midway (KMDW)",
    url: 'https://kalshi.com/markets/kxhighchi/highest-temperature-in-chicago',
  },
  {
    seriesTicker: 'KXHIGHMIA',
    city: 'Miami',
    state: 'FL',
    settlementStation: 'Miami Intl (KMIA)',
    url: 'https://kalshi.com/markets/kxhighmia/highest-temperature-in-miami',
  },
  {
    seriesTicker: 'KXHIGHAUS',
    city: 'Austin',
    state: 'TX',
    settlementStation: 'Austin-Bergstrom (KAUS)',
    url: 'https://kalshi.com/markets/kxhighaus/highest-temperature-in-austin',
  },
  {
    seriesTicker: 'KXHIGHDEN',
    city: 'Denver',
    state: 'CO',
    settlementStation: 'Denver Intl (KDEN)',
    url: 'https://kalshi.com/markets/kxhighden/highest-temperature-in-denver',
  },
  {
    seriesTicker: 'KXHIGHLAX',
    city: 'Los Angeles',
    state: 'CA',
    settlementStation: 'LAX (KLAX)',
    url: 'https://kalshi.com/markets/kxhighlax/highest-temperature-in-los-angeles',
  },
  {
    seriesTicker: 'KXHIGHPHIL',
    city: 'Philadelphia',
    state: 'PA',
    settlementStation: 'Philadelphia Intl (KPHL)',
    url: 'https://kalshi.com/markets/kxhighphil/highest-temperature-in-philadelphia',
  },
];

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Find the Kalshi daily-high temperature market that corresponds to a given
 * city/state, if one exists. Matching is case-insensitive on the city name and,
 * when a state is provided, must also match the state to avoid false positives
 * (e.g. multiple "Austin"s). Returns null when no market covers the location.
 */
export function findKalshiTempMarket(
  city: string | null | undefined,
  state?: string | null | undefined,
): KalshiTempMarket | null {
  if (!city) return null;
  const c = norm(city);
  const s = state ? norm(state) : null;

  for (const m of MARKETS) {
    if (norm(m.city) !== c) continue;
    if (s && norm(m.state) !== s) continue;
    return m;
  }
  return null;
}

/** All cities that have a Kalshi temperature market (for nav / SEO listing). */
export function allKalshiTempMarkets(): readonly KalshiTempMarket[] {
  return MARKETS;
}

/**
 * Build the temperature "buckets" a Kalshi daily-high market typically uses,
 * given the forecast high. Kalshi lists discrete ranges (e.g. 70-71°, 72-73°);
 * this produces a small ladder of 2°F buckets centered on the forecast high so
 * the UI can show "your NWS forecast high lands in this bucket" context.
 *
 * `width` is the bucket width in °F (Kalshi commonly uses 2). `count` buckets
 * are produced, centered so the forecast high sits in the middle bucket.
 */
export interface TempBucket {
  low: number;
  high: number;
  label: string;
  /** True if the provided forecast high falls within this bucket. */
  containsForecast: boolean;
}

export function buildTempBuckets(
  forecastHighF: number,
  width = 2,
  count = 5,
): TempBucket[] {
  if (!Number.isFinite(forecastHighF) || width <= 0 || count <= 0) return [];
  // Snap the forecast high down to the start of its bucket.
  const base = Math.floor(forecastHighF / width) * width;
  // Center the ladder: put the forecast's bucket in the middle.
  const half = Math.floor(count / 2);
  const start = base - half * width;

  const buckets: TempBucket[] = [];
  for (let i = 0; i < count; i++) {
    const low = start + i * width;
    const high = low + width - 1;
    buckets.push({
      low,
      high,
      label: `${low}-${high}°F`,
      containsForecast: forecastHighF >= low && forecastHighF <= high,
    });
  }
  return buckets;
}
