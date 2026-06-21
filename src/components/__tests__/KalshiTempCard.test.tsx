import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KalshiTempCard } from '../KalshiTempCard';
import { findKalshiTempMarket } from '../../lib/kalshi';

describe('<KalshiTempCard />', () => {
  const market = findKalshiTempMarket('Denver', 'CO')!;

  it('renders the market name, ticker, and a link to Kalshi', () => {
    render(<KalshiTempCard market={market} forecastHighF={91} />);
    // The heading carries the market title (the link text also contains the
    // phrase, so scope this assertion to the heading specifically).
    expect(
      screen.getByRole('heading', {
        name: /Denver temperature market on Kalshi/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/KXHIGHDEN/)).toBeInTheDocument();

    const link = screen.getByRole('link', {
      name: /View the Denver temperature market on Kalshi/i,
    });
    expect(link).toHaveAttribute('href', market.url);
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('highlights exactly one temperature bucket for the forecast high', () => {
    const { container } = render(
      <KalshiTempCard market={market} forecastHighF={91} />,
    );
    const hits = container.querySelectorAll('.bucket.hit');
    expect(hits.length).toBe(1);
    // 91 is odd -> bucket 90-91; the highlighted bucket must include "91".
    expect(hits[0].textContent).toContain('91');
  });

  it('omits the bucket ladder when no forecast high is known', () => {
    const { container } = render(
      <KalshiTempCard market={market} forecastHighF={null} />,
    );
    expect(container.querySelectorAll('.bucket').length).toBe(0);
    // The link is still present so the page keeps the SEO reference.
    expect(screen.getByRole('link')).toBeInTheDocument();
  });
});
