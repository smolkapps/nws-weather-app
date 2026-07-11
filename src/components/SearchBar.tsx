import { useState } from 'react';

interface Props {
  onSearch: (query: string) => void;
  /** Called when the user asks to use their device location. */
  onLocate?: () => void;
  loading: boolean;
  /** Prefill (e.g. from a shared ?q= link). */
  initialValue?: string;
}

const EXAMPLES = [
  'New York, NY',
  'Chicago, IL',
  'Denver, CO',
  'Austin, TX',
  'Miami, FL',
];

export function SearchBar({ onSearch, onLocate, loading, initialValue }: Props) {
  const [value, setValue] = useState(initialValue ?? '');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q) onSearch(q);
  }

  return (
    <div>
      <form className="search-form" onSubmit={submit} role="search">
        <input
          type="text"
          aria-label="Search city, ZIP, or latitude,longitude"
          placeholder="City, ZIP, or lat,lon (e.g. Denver, CO)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Loading…' : 'Get forecast'}
        </button>
      </form>
      <div className="examples">
        {onLocate && (
          <button
            type="button"
            className="locate-btn"
            onClick={onLocate}
            disabled={loading}
          >
            📍 Use my location
          </button>
        )}
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={loading}
            onClick={() => {
              setValue(ex);
              onSearch(ex);
            }}
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
