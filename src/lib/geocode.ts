// Geocoding: turn a user query (city, "city, ST", or "lat,lon") into coordinates.
// We support direct lat/lon entry (no network) and city lookup via the free,
// keyless U.S. Census Bureau geocoder, which is appropriate since NWS is US-only.

export interface GeocodeResult {
  lat: number;
  lon: number;
  label: string;
}

const LATLON_RE =
  /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

/**
 * If the query is a bare "lat,lon" pair, parse it without any network call.
 * Returns null if the string is not a coordinate pair or is out of range.
 */
export function parseLatLon(query: string): GeocodeResult | null {
  const m = LATLON_RE.exec(query);
  if (!m) return null;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon, label: `${lat}, ${lon}` };
}

interface CensusGeocodeResponse {
  result?: {
    addressMatches?: Array<{
      matchedAddress?: string;
      coordinates?: { x: number; y: number };
    }>;
  };
}

const CENSUS_ONELINE =
  'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';

/** Build the Census one-line-address geocoder URL for a free-form query. */
export function buildCensusUrl(query: string): string {
  const params = new URLSearchParams({
    address: query,
    benchmark: 'Public_AR_Current',
    format: 'json',
  });
  return `${CENSUS_ONELINE}?${params.toString()}`;
}

/** Map a Census geocoder response into our GeocodeResult (first match). */
export function parseCensusResponse(
  data: CensusGeocodeResponse,
): GeocodeResult | null {
  const match = data.result?.addressMatches?.[0];
  if (!match?.coordinates) return null;
  return {
    // Census returns x = longitude, y = latitude.
    lat: match.coordinates.y,
    lon: match.coordinates.x,
    label: match.matchedAddress ?? '',
  };
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Geocode a free-form query. Tries direct lat/lon parsing first (no network),
 * then falls back to the Census geocoder. `fetchImpl` is injectable for testing.
 */
export async function geocode(
  query: string,
  fetchImpl: FetchLike = fetch,
): Promise<GeocodeResult | null> {
  const direct = parseLatLon(query);
  if (direct) return direct;

  const url = buildCensusUrl(query);
  const res = await fetchImpl(url);
  if (!res.ok) {
    throw new Error(`Geocoder error: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as CensusGeocodeResponse;
  return parseCensusResponse(data);
}
