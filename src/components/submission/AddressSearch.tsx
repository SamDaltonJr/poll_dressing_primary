import { useState } from 'react';
import { useGeocode } from '../../hooks/useGeocode';
import type { GeocodingResult } from '../../types';

interface AddressSearchProps {
  onSelect: (result: GeocodingResult) => void;
}

export default function AddressSearch({ onSelect }: AddressSearchProps) {
  const { results, loading, search, clearResults } = useGeocode();
  const [query, setQuery] = useState('');

  function handleChange(value: string) {
    setQuery(value);
    search(value);
  }

  function handleSelect(result: GeocodingResult) {
    setQuery(result.displayName);
    clearResults();
    onSelect(result);
  }

  return (
    <div className="address-search">
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search for an address..."
      />
      {loading && <p className="search-hint">Searching...</p>}
      {results.length > 0 && (
        <ul className="address-results">
          {results.map((r, i) => (
            <li key={i} onClick={() => handleSelect(r)}>{r.displayName}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
