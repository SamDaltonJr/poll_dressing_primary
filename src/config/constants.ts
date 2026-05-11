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

/**
 * Last day of in-person early voting for the 2026 TX primary runoff.
 * Used by MapPage to pick the default polling-site filter: through this date
 * the map opens on the early-voting view; the following day it flips to the
 * election-day view. Local-time compare (Texas CT), so the rollover happens
 * at the end of May 22 wherever the volunteer is.
 */
export const EARLY_VOTING_END_DATE = new Date(2026, 4, 22); // May 22, 2026

// Nominatim viewbox for DFW area (lon_min, lat_max, lon_max, lat_min)
export const DFW_VIEWBOX = '-97.8,33.4,-96.0,32.5';
export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

import type { MarkerType, MarkerTypeConfig, LocationSize, LocationStatus, PlannedSignStatus } from '../types';

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

/** Sign placement marker icon: white box with black border and bold "T", or purple if retrieved */
export function createSignMarkerIcon(retrieved = false): L.DivIcon {
  const px = 20;
  const half = px / 2;
  const borderColor = retrieved ? '#7c3aed' : 'black';
  const textColor = retrieved ? '#7c3aed' : 'black';
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
    ">T</div>`,
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

// Create colored Leaflet DivIcon; color is driven by location status
export function createMarkerIcon(type: MarkerType, status: LocationStatus, size?: LocationSize): L.DivIcon {
  const config = MARKER_TYPES[type];
  const color = status === 'retrieved' ? config.retrievedColor
    : status === 'dressed' ? config.dressedColor
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
