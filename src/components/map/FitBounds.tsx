import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface FitBoundsProps {
  /** [west, south, east, north] — same order as TEXAS_COUNTIES bbox. */
  bbox: [number, number, number, number] | null;
}

/** Fits the map to a bounding box whenever it changes (e.g. picking a county). */
export default function FitBounds({ bbox }: FitBoundsProps) {
  const map = useMap();
  const key = bbox?.join(',');

  useEffect(() => {
    if (!bbox) return;
    const [w, s, e, n] = bbox;
    map.flyToBounds([[s, w], [n, e]], { padding: [24, 24], duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);

  return null;
}
