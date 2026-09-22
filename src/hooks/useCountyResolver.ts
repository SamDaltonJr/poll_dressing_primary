import { useCallback, useEffect, useState } from 'react';
import { loadCountyShapes, lookupCountySync } from '../utils/countyLookup';

/**
 * Returns a resolver for "which county is this record in": the county stamped
 * on the record at creation time, or a point-in-polygon lookup for records
 * saved without one. The resolver identity changes once boundaries finish
 * loading, so memoized filters that depend on it recompute.
 */
export function useCountyResolver() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadCountyShapes()
      .then(() => { if (!cancelled) setReady(true); })
      .catch((err) => console.error('County boundaries failed to load:', err));
    return () => { cancelled = true; };
  }, []);

  return useCallback(
    (rec: { latitude: number; longitude: number; county?: string | null }): string | null =>
      rec.county || (ready ? lookupCountySync(rec.latitude, rec.longitude) : null),
    [ready],
  );
}
