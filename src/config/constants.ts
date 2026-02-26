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

import type { MarkerType, MarkerTypeConfig, LocationSize, LocationStatus } from '../types';

export const MARKER_TYPES: Record<MarkerType, MarkerTypeConfig> = {
  dualSite: {
    label: 'Early Voting + Election Day',
    color: '#dc2626',
    claimedColor: '#f59e0b',
    dressedColor: '#16a34a',
    defaultVisible: true,
  },
  earlyVotingOnly: {
    label: 'Early Voting Only',
    color: '#dc2626',
    claimedColor: '#f59e0b',
    dressedColor: '#16a34a',
    defaultVisible: true,
  },
  electionDayOnly: {
    label: 'Election Day Only',
    color: '#dc2626',
    claimedColor: '#f59e0b',
    dressedColor: '#16a34a',
    defaultVisible: true,
  },
};

// Size tier → pixel dimensions for marker circles
const SIZE_PX: Record<LocationSize, number> = { S: 16, M: 24, L: 32 };

/** Distribution-point marker icon: blue diamond, distinct from polling circles */
export function createDistributionPointIcon(): L.DivIcon {
  const px = 28;
  const half = px / 2;
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: #2563eb;
      width: ${px}px;
      height: ${px}px;
      border-radius: 4px;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      transform: rotate(45deg);
    "><div style="
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      color: white;
      font-size: 14px;
      font-weight: 700;
    ">S</div></div>`,
    iconSize: [px, px],
    iconAnchor: [half, half],
    popupAnchor: [0, -(half + 2)],
  });
}

// Create colored Leaflet DivIcon; color is driven by location status
export function createMarkerIcon(type: MarkerType, status: LocationStatus, size?: LocationSize): L.DivIcon {
  const config = MARKER_TYPES[type];
  const color = status === 'dressed' ? config.dressedColor
    : status === 'claimed' ? config.claimedColor
    : config.color;
  const px = SIZE_PX[size ?? 'M'];
  const half = px / 2;
  const border = size === 'L' ? 4 : 3;
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
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
