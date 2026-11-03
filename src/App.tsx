import { useCallback, useEffect, useRef, useState } from 'react';
import { SearchBar } from './components/SearchBar';
import { CurrentConditionsCard } from './components/CurrentConditionsCard';
import { ForecastList } from './components/ForecastList';
import { HourlyForecast } from './components/HourlyForecast';
import { AlertsList } from './components/AlertsList';
import { KalshiTempCard } from './components/KalshiTempCard';
import { ShareButton } from './components/ShareButton';
import { SkeletonCards } from './components/SkeletonCards';
import { geocode } from './lib/geocode';
import { fetchWeatherBundle, type WeatherBundle } from './lib/nwsClient';
import { findKalshiTempMarket } from './lib/kalshi';
import { todaysHighF } from './lib/forecast';
import { buildDemoBundle, DEMO_LOCATION_LABEL } from './lib/demo';

type Status = 'idle' | 'loading' | 'ready' | 'error';

const DEFAULT_QUERY = 'New York, NY';
const APP_NAME = 'NWS Weather';

/** Initial search, honoring a shared `?q=` link. */
function initialQuery(): string {
  const q = new URLSearchParams(window.location.search).get('q');
  return q?.trim() || DEFAULT_QUERY;
}

function locationLabel(bundle: WeatherBundle): string {
  const { city, state } = bundle.location;
  return state ? `${city}, ${state}` : city;
}

/** Reflect the current search in the URL so the page is shareable/bookmarkable. */
function syncUrl(query: string) {
  try {
    const params = new URLSearchParams(window.location.search);
    params.set('q', query);
    window.history.replaceState(null, '', `?${params.toString()}`);
  } catch {
    // Older browsers / restricted contexts: the app still works, just not shareable.
  }
}

function friendlyError(e: unknown): string {
  if (e instanceof TypeError) {
    // fetch() rejects with TypeError on network failure.
    return 'Could not reach the weather service. Check your connection and try again, or view the saved sample data below.';
  }
  return e instanceof Error
    ? e.message
    : 'Something went wrong fetching the forecast.';
}

export function App() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string>('');
  const [bundle, setBundle] = useState<WeatherBundle | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const hasBundle = useRef(false);
  hasBundle.current = bundle !== null;

  const showDemo = useCallback(() => {
    setBundle(buildDemoBundle());
    setIsDemo(true);
    setStatus('ready');
    setError('');
    document.title = `Sample forecast — ${APP_NAME}`;
  }, []);

  const search = useCallback(
    async (query: string, opts?: { auto?: boolean }) => {
      setStatus('loading');
      setError('');
      setLastQuery(query);
      try {
        const geo = await geocode(query);
        if (!geo) {
          setStatus('error');
          setError(
            `Could not find "${query}". Try "City, ST", a ZIP code, or "lat,lon".`,
          );
          return;
        }
        const result = await fetchWeatherBundle(geo.lat, geo.lon);
        setBundle(result);
        setIsDemo(false);
        setStatus('ready');
        syncUrl(query);
        document.title = `${locationLabel(result)} forecast — ${APP_NAME}`;
      } catch (e) {
        // The very first, automatic load failing usually means the user is
        // offline — fall back to the bundled sample data instead of a blank
        // page. Explicit searches surface the error and offer sample data.
        if (opts?.auto && !hasBundle.current) {
          showDemo();
          return;
        }
        setStatus('error');
        setError(friendlyError(e));
      }
    },
    [showDemo],
  );

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('error');
      setError(
        'Your browser does not support location access — try searching by city or ZIP instead.',
      );
      return;
    }
    setStatus('loading');
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void search(
          `${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`,
        );
      },
      () => {
        setStatus('error');
        setError(
          'Could not read your location (permission denied or unavailable) — try searching by city or ZIP instead.',
        );
      },
      { timeout: 10000 },
    );
  }, [search]);

  // Load the shared/bookmarked location — or a sensible default — on first
  // paint so the page is never empty.
  useEffect(() => {
    void search(initialQuery(), { auto: true });
  }, [search]);

  const market = bundle
    ? findKalshiTempMarket(bundle.location.city, bundle.location.state)
    : null;
  const high = bundle ? todaysHighF(bundle.forecast) : null;
  const loading = status === 'loading';

  return (
    <main>
      <header className="app-header">
        <div className="header-row">
          <h1>⛅ {APP_NAME}</h1>
          <ShareButton />
        </div>
        <p>
          Fast, free U.S. forecasts straight from the National Weather Service —
          current conditions, hourly and 7-day outlooks, and active alerts. No
          account or API key. Website page visits are counted with Umami; weather searches are excluded. <a href="/privacy.html">Website privacy</a>.
        </p>
      </header>

      <SearchBar
        onSearch={search}
        onLocate={locate}
        loading={loading}
        initialValue={initialQuery() === DEFAULT_QUERY ? '' : initialQuery()}
      />

      <div className="sr-only" role="status" aria-live="polite">
        {loading
          ? 'Loading forecast…'
          : bundle
            ? `Forecast loaded for ${locationLabel(bundle)}`
            : ''}
      </div>

      {status === 'error' && (
        <div className="error" role="alert">
          <p>{error}</p>
          <div className="error-actions">
            {lastQuery && (
              <button type="button" onClick={() => void search(lastQuery)}>
                Try again
              </button>
            )}
            <button type="button" className="secondary" onClick={showDemo}>
              View sample data
            </button>
          </div>
        </div>
      )}

      {loading && !bundle && <SkeletonCards />}

      {isDemo && bundle && (
        <div className="demo-banner" role="status">
          <strong>Sample data.</strong> Live forecasts are unreachable right
          now, so this is a saved forecast for {DEMO_LOCATION_LABEL} — handy for
          a look around, not for planning your day.{' '}
          <button type="button" onClick={() => void search(lastQuery || DEFAULT_QUERY)}>
            Retry live data
          </button>
        </div>
      )}

      {bundle && (
        <div
          className={loading ? 'results is-refreshing' : 'results'}
          aria-busy={loading}
        >
          <AlertsList
            alerts={bundle.alerts}
            timeZone={bundle.location.timeZone}
          />
          <CurrentConditionsCard
            location={bundle.location}
            current={bundle.current}
          />
          {market && <KalshiTempCard market={market} forecastHighF={high} />}
          <HourlyForecast
            periods={bundle.hourly}
            timeZone={bundle.location.timeZone}
          />
          <ForecastList periods={bundle.forecast} />
        </div>
      )}

      <footer className="app-footer">
        <p>
          Weather data:{' '}
          <a href="https://www.weather.gov/documentation/services-web-api">
            NWS / NOAA public API
          </a>{' '}
          (no key required, U.S. only). Geocoding by the U.S. Census Bureau.
          Temperature markets referenced from{' '}
          <a href="https://kalshi.com">Kalshi</a> (not affiliated).
        </p>
        <p>
          Free and open source —{' '}
          <a href="https://github.com/smolkapps/nws-weather-app">
            view the code on GitHub
          </a>
          . Forecasts can change quickly; always check official NWS alerts
          before making safety decisions.
        </p>
      </footer>
    </main>
  );
}
