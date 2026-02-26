import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

interface FlyToLocationProps {
  target: { lat: number; lng: number } | null;
  onComplete: () => void;
}

export default function FlyToLocation({ target, onComplete }: FlyToLocationProps) {
  const map = useMap();
  const prevTarget = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!target) return;
    if (
      prevTarget.current &&
      prevTarget.current.lat === target.lat &&
      prevTarget.current.lng === target.lng
    ) return;

    prevTarget.current = target;
    map.flyTo([target.lat, target.lng], 16, { duration: 1 });

    const timer = setTimeout(() => {
      onComplete();
    }, 1100);

    return () => clearTimeout(timer);
  }, [target, map, onComplete]);

  return null;
}
