import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

interface HeatmapLayerProps {
  points: Array<[number, number]>;
}

export default function HeatmapLayer({ points }: HeatmapLayerProps) {
  const map = useMap();
  const heatLayerRef = useRef<L.HeatLayer | null>(null);

  useEffect(() => {
    const heat = L.heatLayer(points, {
      radius: 30,
      blur: 20,
      maxZoom: 13,
      minOpacity: 0.3,
      gradient: {
        0.2: '#ffffb2',
        0.4: '#fed976',
        0.6: '#feb24c',
        0.8: '#f03b20',
        1.0: '#bd0026',
      },
    });

    heat.addTo(map);
    heatLayerRef.current = heat;

    return () => {
      map.removeLayer(heat);
      heatLayerRef.current = null;
    };
  }, [map, points]);

  return null;
}
