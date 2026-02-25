import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet default marker icons in bundled environments
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Map defaults — centered on Dallas-Fort Worth area
export const MAP_CENTER: [number, number] = [32.78, -96.80];
export const MAP_ZOOM = 10;
export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Nominatim viewbox for DFW area (lon_min, lat_max, lon_max, lat_min)
export const DFW_VIEWBOX = '-97.8,33.4,-96.0,32.5';

// Marker type registry — add new types here
import type { MarkerType, MarkerTypeConfig, LocationSize } from '../types';

export const MARKER_TYPES: Record<MarkerType, MarkerTypeConfig> = {
  sign: { label: 'Big Signs', color: '#2563eb', defaultVisible: true },
  earlyVoting: { label: 'Early Voting', color: '#dc2626', defaultVisible: true },
  electionDay: { label: 'Election Day (Dem)', color: '#9333ea', defaultVisible: true },
};

// Size tier → pixel dimensions for marker circles
const SIZE_PX: Record<LocationSize, number> = { S: 16, M: 24, L: 32 };

// Create colored Leaflet DivIcon for each marker type, optionally sized
export function createMarkerIcon(type: MarkerType, size?: LocationSize): L.DivIcon {
  const config = MARKER_TYPES[type];
  const px = SIZE_PX[size ?? 'M'];
  const half = px / 2;
  const border = size === 'L' ? 4 : 3;
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${config.color};
      width: ${px}px;
      height: ${px}px;
      border-radius: 50%;
      border: ${border}px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [px, px],
    iconAnchor: [half, half],
    popupAnchor: [0, -(half + 2)],
  });
}
