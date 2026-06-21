import { describe, expect, it, vi } from 'vitest';
import {
  buildCensusUrl,
  geocode,
  parseCensusResponse,
  parseLatLon,
} from '../geocode';

describe('parseLatLon', () => {
  it('parses a valid lat,lon pair', () => {
    expect(parseLatLon('40.7128, -74.006')).toEqual({
      lat: 40.7128,
      lon: -74.006,
      label: '40.7128, -74.006',
    });
    expect(parseLatLon('38.5816,-121.4944')).toEqual({
      lat: 38.5816,
      lon: -121.4944,
      label: '38.5816, -121.4944',
    });
  });

  it('rejects non-coordinate strings', () => {
    expect(parseLatLon('Sacramento, CA')).toBeNull();
    expect(parseLatLon('90210')).toBeNull();
    expect(parseLatLon('')).toBeNull();
  });

  it('rejects out-of-range coordinates', () => {
    expect(parseLatLon('200, 50')).toBeNull();
    expect(parseLatLon('45, 999')).toBeNull();
  });
});

describe('buildCensusUrl', () => {
  it('encodes the query and benchmark', () => {
    const url = buildCensusUrl('1600 Pennsylvania Ave NW, Washington, DC');
    expect(url).toContain('geocoding.geo.census.gov');
    expect(url).toContain('benchmark=Public_AR_Current');
    expect(url).toContain('address=1600+Pennsylvania');
  });
});

describe('parseCensusResponse', () => {
  it('maps x->lon and y->lat from the first match', () => {
    const data = {
      result: {
        addressMatches: [
          {
            matchedAddress: 'WASHINGTON, DC',
            coordinates: { x: -77.0365, y: 38.8977 },
          },
        ],
      },
    };
    expect(parseCensusResponse(data)).toEqual({
      lat: 38.8977,
      lon: -77.0365,
      label: 'WASHINGTON, DC',
    });
  });

  it('returns null with no matches', () => {
    expect(parseCensusResponse({ result: { addressMatches: [] } })).toBeNull();
    expect(parseCensusResponse({})).toBeNull();
  });
});

describe('geocode', () => {
  it('short-circuits a lat,lon query without any fetch', async () => {
    const fetchSpy = vi.fn();
    const r = await geocode('40.7128,-74.006', fetchSpy);
    expect(r).toEqual({
      lat: 40.7128,
      lon: -74.006,
      label: '40.7128, -74.006',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('falls back to the Census geocoder for a place name', async () => {
    const stub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          result: {
            addressMatches: [
              { matchedAddress: 'DENVER, CO', coordinates: { x: -104.99, y: 39.74 } },
            ],
          },
        }),
        { status: 200 },
      ),
    );
    const r = await geocode('Denver, CO', stub);
    expect(stub).toHaveBeenCalledOnce();
    expect(r?.lat).toBe(39.74);
    expect(r?.lon).toBe(-104.99);
  });

  it('throws on a geocoder HTTP error', async () => {
    const stub = vi.fn(async () => new Response('nope', { status: 500, statusText: 'Server Error' }));
    await expect(geocode('Nowhere', stub)).rejects.toThrow(/Geocoder error: 500/);
  });
});
