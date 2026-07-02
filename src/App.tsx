import { useCallback, useEffect, useState } from 'react';
import { SearchBar } from './components/SearchBar';
import { CurrentConditionsCard } from './components/CurrentConditionsCard';
import { ForecastList } from './components/ForecastList';
import { HourlyForecast } from './components/HourlyForecast';
import { AlertsList } from './components/AlertsList';
import { KalshiTempCard } from './components/KalshiTempCard';
import { geocode } from './lib/geocode';
import { fetchWeatherBundle, type WeatherBundle } from './lib/nwsClient';
import { findKalshiTempMarket } from './lib/kalshi';
import { todaysHighF } from './lib/forecast';

type Status = 'idle' | 'loading' | 'ready' | 'error';

export function App() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string>('');
  const [bundle, setBundle] = useState<WeatherBundle | null>(null);

  const search = useCallback(async (query: string) => {
    setStatus('loading');
    setError('');
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
      setStatus('ready');
    } catch (e) {
      setStatus('error');
      setError(
        e instanceof Error
          ? e.message
          : 'Something went wrong fetching the forecast.',
      );
    }
  }, []);

  // Load a sensible default on first paint so the page is never empty.
  useEffect(() => {
    void search('New York, NY');
  }, [search]);

  const market = bundle
    ? findKalshiTempMarket(bundle.location.city, bundle.location.state)
    : null;
  const high = bundle ? todaysHighF(bundle.forecast) : null;

  return (
    <main>
      <header className="app-header">
        <h1>⛅ NWS Weather</h1>
        <p>
          Fast, clean U.S. forecasts straight from the free National Weather
          Service API — plus the matching Kalshi temperature market when one
          exists.
        </p>
      </header>

      <SearchBar onSearch={search} loading={status === 'loading'} />

      {status === 'error' && <div className="error">{error}</div>}

      {status === 'loading' && !bundle && (
        <div className="status">Loading forecast…</div>
      )}

      {bundle && (
        <>
          <AlertsList alerts={bundle.alerts} />
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
        </>
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
      </footer>
    </main>
  );
}
