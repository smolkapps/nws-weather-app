import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ShareButton } from '../ShareButton';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('<ShareButton />', () => {
  it('copies the current URL when the native share sheet is unavailable', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', {
      ...navigator,
      share: undefined,
      clipboard: { writeText },
    });

    render(<ShareButton />);
    fireEvent.click(
      screen.getByRole('button', { name: /share a link to this forecast/i }),
    );

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(window.location.href));
    expect(await screen.findByText(/link copied/i)).toBeInTheDocument();
  });

  it('prefers the native share sheet when present', async () => {
    const share = vi.fn(async () => {});
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', {
      ...navigator,
      share,
      clipboard: { writeText },
    });

    render(<ShareButton />);
    fireEvent.click(
      screen.getByRole('button', { name: /share a link to this forecast/i }),
    );

    await waitFor(() =>
      expect(share).toHaveBeenCalledWith(
        expect.objectContaining({ url: window.location.href }),
      ),
    );
    expect(writeText).not.toHaveBeenCalled();
  });
});
