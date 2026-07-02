import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { HourlyForecast } from '../HourlyForecast';
import { normalizeForecast } from '../../lib/normalize';
import hourlyFixture from '../../lib/__tests__/fixtures/forecastHourly.json';
import type { NwsForecastResponse } from '../../lib/types';

const periods = normalizeForecast(hourlyFixture as NwsForecastResponse);
// Fixture timestamps carry a -04:00 offset; format labels in that zone so the
// assertions are independent of the machine's local time zone.
const TZ = 'America/New_York';

describe('<HourlyForecast />', () => {
  it('renders only the requested number of upcoming hours', () => {
    render(<HourlyForecast periods={periods} timeZone={TZ} hours={6} />);
    const region = screen.getByRole('region', { name: /Hourly forecast/i });
    expect(within(region).getByText(/Next 6 hours/i)).toBeInTheDocument();
    // 6 hour cells, each with an hour label.
    expect(region.querySelectorAll('.hour').length).toBe(6);
  });

  it('shows the hour label, temperature, and precip chance for each cell', () => {
    render(<HourlyForecast periods={periods} timeZone={TZ} hours={3} />);
    const region = screen.getByRole('region', { name: /Hourly forecast/i });
    // First fixture period starts at 15:00 (-04:00) -> "3 PM" in New York.
    expect(within(region).getByText('3 PM')).toBeInTheDocument();
    // First period temperature is 79°F with a 23% precip chance.
    expect(within(region).getByText('79°F')).toBeInTheDocument();
    expect(within(region).getByText('23%')).toBeInTheDocument();
  });

  it('defaults to 12 hours when the count is not specified', () => {
    render(<HourlyForecast periods={periods} timeZone={TZ} />);
    const region = screen.getByRole('region', { name: /Hourly forecast/i });
    expect(region.querySelectorAll('.hour').length).toBe(12);
  });

  it('renders nothing when there are no hourly periods', () => {
    const { container } = render(
      <HourlyForecast periods={[]} timeZone={TZ} />,
    );
    expect(container.querySelector('.hourly-row')).toBeNull();
  });
});
