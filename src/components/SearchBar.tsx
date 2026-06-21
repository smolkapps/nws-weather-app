import { useState } from 'react';

interface Props {
  onSearch: (query: string) => void;
  loading: boolean;
}

const EXAMPLES = [
  'New York, NY',
  'Chicago, IL',
  'Denver, CO',
  'Austin, TX',
  '38.5816,-121.4944',
];

export function SearchBar({ onSearch, loading }: Props) {
  const [value, setValue] = useState('');

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
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Loading…' : 'Get forecast'}
        </button>
      </form>
      <div className="examples">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
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
