import { useState, useMemo, useRef, useEffect } from 'react';
import type { MapMarker } from '../../types';

interface SearchBarProps {
  markers: MapMarker[];
  onSelect: (marker: MapMarker) => void;
}

export default function SearchBar({ markers, onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return markers
      .filter((m) => m.label.toLowerCase().includes(q) || m.address.toLowerCase().includes(q))
      .slice(0, 10);
  }, [markers, query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(marker: MapMarker) {
    setQuery('');
    setOpen(false);
    onSelect(marker);
  }

  return (
    <div className="search-bar" ref={wrapperRef}>
      <div className="search-bar-input-wrapper">
        <span className="search-bar-icon">&#128269;</span>
        <input
          type="text"
          className="search-bar-input"
          placeholder="Search locations..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button
            className="search-bar-clear"
            onClick={() => { setQuery(''); setOpen(false); }}
            type="button"
          >
            &times;
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="search-results">
          {results.map((m) => (
            <li key={m.id}>
              <button className="search-result-item" onClick={() => handleSelect(m)}>
                <span className="search-result-name">{m.label}</span>
                <span className="search-result-address">{m.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
