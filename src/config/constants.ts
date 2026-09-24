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

// Map defaults — whole-state view of Texas. The map flies to the volunteer's
// location once the browser grants geolocation.
export const MAP_CENTER: [number, number] = [31.2, -99.3];
export const MAP_ZOOM = 6;
/** Zoom for pickers that need street-level detail (sign submission form). */
export const DETAIL_ZOOM = 12;

// Nominatim viewbox biasing search results to Texas (lon_min, lat_max, lon_max, lat_min)
export const TEXAS_VIEWBOX = '-106.65,36.5,-93.51,25.84';
export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Satellite imagery for placing pins on the right building (Esri World
// Imagery, free with attribution), plus a road/label overlay so streets stay
// readable on top of it.
export const SATELLITE_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
export const SATELLITE_LABELS_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}';
export const SATELLITE_ATTRIBUTION = 'Imagery &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community';

import type { MarkerType, MarkerTypeConfig, LocationSize, LocationStatus, PlannedSignStatus, PriorityTier } from '../types';

export const MARKER_TYPES: Record<MarkerType, MarkerTypeConfig> = {
  dualSite: {
    label: 'Early Voting + Election Day',
    color: '#dc2626',
    claimedColor: '#f59e0b',
    dressedColor: '#16a34a',
    retrievedColor: '#7c3aed',
  },
  earlyVotingOnly: {
    label: 'Early Voting Only',
    color: '#dc2626',
    claimedColor: '#f59e0b',
    dressedColor: '#16a34a',
    retrievedColor: '#7c3aed',
  },
  electionDayOnly: {
    label: 'Election Day Only',
    color: '#dc2626',
    claimedColor: '#f59e0b',
    dressedColor: '#16a34a',
    retrievedColor: '#7c3aed',
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

/** Pin-drop marker icon: purple circle with "+", for missing location reports */
export function createPinDropIcon(): L.DivIcon {
  const px = 32;
  const half = px / 2;
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: #7c3aed;
      width: ${px}px;
      height: ${px}px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 18px;
      font-weight: 700;
    ">+</div>`,
    iconSize: [px, px],
    iconAnchor: [half, half],
    popupAnchor: [0, -(half + 2)],
  });
}

/** Sign placement marker icon: white box with black border and the active campaign letter, or purple if retrieved */
export function createSignMarkerIcon(letter: string, retrieved = false): L.DivIcon {
  const px = 20;
  const half = px / 2;
  const borderColor = retrieved ? '#7c3aed' : 'black';
  const textColor = retrieved ? '#7c3aed' : 'black';
  const safeLetter = (letter || '?').charAt(0).toUpperCase();
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: white;
      width: ${px}px;
      height: ${px}px;
      border-radius: 3px;
      border: 2px solid ${borderColor};
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${textColor};
      font-size: 13px;
      font-weight: 700;
      line-height: 1;
    ">${safeLetter}</div>`,
    iconSize: [px, px],
    iconAnchor: [half, half],
    popupAnchor: [0, -(half + 2)],
  });
}

/** Planned sign location icon: dashed orange square with "P" (planned), solid green (placed) */
export function createPlannedSignIcon(status: PlannedSignStatus = 'planned'): L.DivIcon {
  const px = 22;
  const half = px / 2;
  const isPlaced = status === 'placed';
  const borderColor = isPlaced ? '#16a34a' : '#7c3aed';
  const borderStyle = isPlaced ? 'solid' : 'dashed';
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: white;
      width: ${px}px;
      height: ${px}px;
      border-radius: 3px;
      border: 2.5px ${borderStyle} ${borderColor};
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${borderColor};
      font-size: 13px;
      font-weight: 700;
      line-height: 1;
    ">P</div>`,
    iconSize: [px, px],
    iconAnchor: [half, half],
    popupAnchor: [0, -(half + 2)],
  });
}

// Create colored Leaflet DivIcon; color is driven by location status.
// Priority 1 sites carry a white star so they stand out at any zoom.
export function createMarkerIcon(type: MarkerType, status: LocationStatus, size?: LocationSize, tier?: PriorityTier): L.DivIcon {
  const config = MARKER_TYPES[type];
  const color = status === 'retrieved' ? config.retrievedColor
    : status === 'dressed' ? config.dressedColor
    : status === 'claimed' ? config.claimedColor
    : config.color;
  const px = SIZE_PX[size ?? 'M'];
  const half = px / 2;
  const border = size === 'L' ? 4 : 3;
  const star = tier === 1
    ? `<span style="color: white; font-size: ${Math.round(px * 0.55)}px; line-height: 1;">&#9733;</span>`
    : '';
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: ${px}px;
      height: ${px}px;
      border-radius: 50%;
      border: ${border}px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
    ">${star}</div>`,
    iconSize: [px, px],
    iconAnchor: [half, half],
    popupAnchor: [0, -(half + 2)],
  });
}

/** Pin being moved by an admin: large amber target so it stands out on satellite imagery. */
export function createMovePinIcon(): L.DivIcon {
  const px = 34;
  const half = px / 2;
  return L.divIcon({
    className: 'custom-marker move-pin-marker',
    html: `<div style="
      width: ${px}px;
      height: ${px}px;
      border-radius: 50%;
      background: rgba(245, 158, 11, 0.35);
      border: 3px solid #f59e0b;
      box-shadow: 0 0 0 2px white, 0 2px 8px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    "><div style="width: 8px; height: 8px; border-radius: 50%; background: #f59e0b; box-shadow: 0 0 0 2px white;"></div></div>`,
    iconSize: [px, px],
    iconAnchor: [half, half],
  });
}
