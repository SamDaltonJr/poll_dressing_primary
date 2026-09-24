import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

interface FitBoundsProps {
  /** [west, south, east, north] — same order as TEXAS_COUNTIES bbox. */
  bbox: [number, number, number, number] | null;
}

/**
 * Fits the map to a bounding box whenever it changes (e.g. picking a county).
 * The first fit (a remembered county or region on page load) is instant; later
 * ones fly there.
 */
export default function FitBounds({ bbox }: FitBoundsProps) {
  const map = useMap();
  const key = bbox?.join(',');
  const fitted = useRef(false);

  useEffect(() => {
    if (!bbox) return;
    const [w, s, e, n] = bbox;
    const bounds: [[number, number], [number, number]] = [[s, w], [n, e]];
    const options = { padding: [24, 24] as [number, number] };
    // Leaflet may have measured the container before layout finished.
    map.invalidateSize();
    if (!fitted.current) {
      fitted.current = true;
      map.fitBounds(bounds, { ...options, animate: false });
      return;
    }
    try {
      map.flyToBounds(bounds, { ...options, duration: 0.8 });
    } catch {
      // Leaflet's fly animation divides by zero when the target is the view
      // already showing ("All of Texas" on a fresh map); just jump instead.
      map.fitBounds(bounds, options);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);

  return null;
}
