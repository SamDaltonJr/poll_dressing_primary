import { useMemo } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import PollingMarker from './PollingMarker';
import { MAP_CENTER, MAP_ZOOM, TILE_URL, TILE_ATTRIBUTION } from '../../config/constants';
import type { MapMarker, DressingRecord } from '../../types';

interface MapViewProps {
  markers: MapMarker[];
  dressedIds: Set<string>;
  dressings: DressingRecord[];
  onDressClick: (marker: MapMarker) => void;
  hasAccess: boolean;
}

const GREEN = '#16a34a';
const RED = '#dc2626';

/** Build a cluster icon whose ring shows green (dressed) vs red (undressed) proportion. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createClusterIcon(cluster: any): L.DivIcon {
  const children = cluster.getAllChildMarkers();
  const count = children.length;

  let dressedCount = 0;
  for (const child of children) {
    const html = (child.getIcon().options as L.DivIconOptions).html ?? '';
    if (typeof html === 'string' && html.includes(GREEN)) {
      dressedCount++;
    }
  }

  const size = count < 20 ? 36 : count < 100 ? 44 : 52;
  const half = size / 2;

  let background: string;
  if (dressedCount === 0) {
    background = RED;
  } else if (dressedCount === count) {
    background = GREEN;
  } else {
    const pct = Math.round((dressedCount / count) * 100);
    background = `conic-gradient(${GREEN} 0% ${pct}%, ${RED} ${pct}% 100%)`;
  }

  return L.divIcon({
    html: `<div class="cluster-outer" style="
      width: ${size}px;
      height: ${size}px;
      background: ${background};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    ">
      <span class="cluster-inner" style="
        background: white;
        width: ${size - 10}px;
        height: ${size - 10}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: ${count >= 100 ? 13 : 14}px;
        color: #333;
      ">${count}</span>
    </div>`,
    className: 'custom-cluster-icon',
    iconSize: L.point(size, size),
    iconAnchor: [half, half],
  });
}

export default function MapView({ markers, dressedIds, dressings, onDressClick, hasAccess }: MapViewProps) {
  // Build a lookup for dressing records
  const dressingMap = useMemo(() => {
    const m = new Map<string, DressingRecord>();
    for (const d of dressings) m.set(d.locationId, d);
    return m;
  }, [dressings]);

  // Force cluster re-render when dressing data changes
  const clusterKey = useMemo(() => {
    return Array.from(dressedIds).sort().join(',');
  }, [dressedIds]);

  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={MAP_ZOOM}
      className="map-container"
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

      <MarkerClusterGroup
        key={clusterKey}
        chunkedLoading
        disableClusteringAtZoom={14}
        maxClusterRadius={60}
        spiderfyOnMaxZoom={false}
        iconCreateFunction={createClusterIcon}
      >
        {markers.map((marker) => (
          <PollingMarker
            key={marker.id}
            marker={marker}
            isDressed={dressedIds.has(marker.id)}
            dressing={dressingMap.get(marker.id)}
            onDressClick={onDressClick}
            hasAccess={hasAccess}
          />
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
