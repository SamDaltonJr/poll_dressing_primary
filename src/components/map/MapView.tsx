import { MapContainer, TileLayer } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import SignMarker from './SignMarker';
import { MAP_CENTER, MAP_ZOOM, TILE_URL, TILE_ATTRIBUTION, MARKER_TYPES } from '../../config/constants';
import type { MapMarker } from '../../types';

interface MapViewProps {
  signMarkers: MapMarker[];
  pollingMarkers: MapMarker[];
}

/** Build a colored cluster icon whose ring reflects the mix of marker types inside. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createClusterIcon(cluster: any): L.DivIcon {
  const children = cluster.getAllChildMarkers();
  const count = children.length;

  // Count each polling type by inspecting the marker icon HTML
  let evCount = 0;
  let edCount = 0;
  for (const child of children) {
    const icon = child.getIcon();
    const html = (icon.options as L.DivIconOptions).html ?? '';
    // Early voting markers use #dc2626 (red); election day use #9333ea (purple)
    if (typeof html === 'string' && html.includes(MARKER_TYPES.earlyVoting.color)) {
      evCount++;
    } else {
      edCount++;
    }
  }

  const evColor = MARKER_TYPES.earlyVoting.color;   // #dc2626
  const edColor = MARKER_TYPES.electionDay.color;    // #9333ea

  // Size scales with count
  const size = count < 20 ? 36 : count < 100 ? 44 : 52;
  const half = size / 2;

  // Build a conic-gradient ring showing the proportion of each type
  let background: string;
  if (evCount === 0) {
    background = edColor;
  } else if (edCount === 0) {
    background = evColor;
  } else {
    const evPct = Math.round((evCount / count) * 100);
    background = `conic-gradient(${evColor} 0% ${evPct}%, ${edColor} ${evPct}% 100%)`;
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

export default function MapView({ signMarkers, pollingMarkers }: MapViewProps) {
  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={MAP_ZOOM}
      className="map-container"
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

      {/* Signs: always visible, never clustered */}
      {signMarkers.map((marker) => (
        <SignMarker key={marker.id} marker={marker} />
      ))}

      {/* Polling locations: clustered when zoomed out, individual at street zoom */}
      <MarkerClusterGroup
        chunkedLoading
        disableClusteringAtZoom={14}
        maxClusterRadius={60}
        spiderfyOnMaxZoom={false}
        iconCreateFunction={createClusterIcon}
      >
        {pollingMarkers.map((marker) => (
          <SignMarker key={marker.id} marker={marker} />
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
