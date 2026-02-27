import { useState, useRef, useCallback } from 'react';
import { forwardGeocode } from '../services/geocodeService';
import type { GeocodingResult } from '../types';

export function useGeocode() {
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (query.trim().length < 3) {
      setResults([]);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await forwardGeocode(query);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);
  }, []);

  const clearResults = useCallback(() => setResults([]), []);

  return { results, loading, search, clearResults };
}
