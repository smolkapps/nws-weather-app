# NWS Weather

A clean, fast single-page weather app built on the **free, keyless U.S. National
Weather Service (NWS) API**. Search any U.S. location and get current
conditions, a multi-day forecast, and active weather alerts — and, for cities
that have one, a contextual reference to the matching **Kalshi daily
high-temperature market**.

Built with Vite + React + TypeScript. No API key, no backend, no tracking.

## Why

The NWS API (`api.weather.gov`) is the authoritative source for U.S. weather and
is completely free and keyless, but its raw GeoJSON responses are not pleasant to
read. This app normalizes that data (SI → US units, severity-sorted alerts,
station resolution) and renders it cleanly.

It also bridges to **Kalshi temperature markets**: Kalshi lists daily "highest
temperature in `<city>`" event contracts that settle on the *same* official NWS
daily high this app already displays. On a city page that has a market (NYC,
Chicago, Miami, Austin, Denver, Los Angeles, Philadelphia), the app shows which
2°F temperature bucket today's NWS forecast high falls into and links out to the
market. This is a *reference only* — the app does not fetch or quote live Kalshi
prices and is not affiliated with Kalshi.

## Features

- Search by city, `City, ST`, or raw `lat,lon` (coordinates skip geocoding).
- Current conditions: temp, humidity, dew point, wind (speed + cardinal),
  heat index / wind chill when present.
- Multi-day forecast with precipitation probability and short forecast text.
- Active NWS alerts, sorted by severity (Extreme → Severe → … ) then onset.
- Kalshi temperature-market reference + bucket ladder for supported cities.
- Graceful degradation: a station outage or alerts hiccup never blanks the page;
  the forecast still renders.

## Architecture

```
src/
  lib/
    types.ts        Domain types + the NWS response slices we read
    units.ts        Pure unit conversions (C→F, km/h→mph, deg→cardinal, …)
    normalize.ts    Raw NWS JSON → normalized domain types; alert sorting
    geocode.ts      lat,lon parsing + U.S. Census geocoder
    nwsClient.ts    Orchestrates the /points → forecast/stations/obs/alerts flow
    forecast.ts     "today's high" selection for the Kalshi anchor
    kalshi.ts       City → Kalshi market map + temperature-bucket builder
    __tests__/      Unit tests, including tests against SAVED NWS fixtures
  components/       React UI (SearchBar, CurrentConditions, Forecast, Alerts, Kalshi)
  App.tsx           State wiring
```

The network layer takes an injectable `fetch`, so all parsing/orchestration is
tested against **saved fixtures** (`src/lib/__tests__/fixtures/*.json`, captured
from the live API) — the test suite never touches the network.

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build to dist/
npm test         # vitest unit + component tests
```

## Data sources & disclaimer

- Weather: [NWS / NOAA Web API](https://www.weather.gov/documentation/services-web-api)
  (public, no key, **U.S. only**). Please respect their usage guidelines.
- Geocoding: [U.S. Census Bureau geocoder](https://geocoding.geo.census.gov/)
  (public, no key).
- Temperature markets referenced from [Kalshi](https://kalshi.com). This project
  is **not affiliated with Kalshi**, does not quote live prices, and is **not
  financial advice**. Trading involves risk.

## License

MIT — see [LICENSE](./LICENSE).
