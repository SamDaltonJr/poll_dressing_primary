import { useMemo, useCallback } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import PollingMarker from './PollingMarker';
import SignMarker from './SignMarker';
import DistributionPointMarker from './DistributionPointMarker';
import PinDropHandler from './PinDropHandler';
import FlyToLocation from './FlyToLocation';
import { MAP_CENTER, MAP_ZOOM, TILE_URL, TILE_ATTRIBUTION } from '../../config/constants';
import type { MapMarker, DressingRecord, DistributionPoint, SignSubmission, LocationStatus } from '../../types';

interface MapViewProps {
  markers: MapMarker[];
  dressedIds: Set<string>;
  claimedIds: Set<string>;
  dressings: DressingRecord[];
  onClaimClick: (marker: MapMarker) => void;
  onConfirmClick: (marker: MapMarker) => void;
  onReportClick: (marker: MapMarker) => void;
  onIncorrectReportClick: (marker: MapMarker) => void;
  hasAccess: boolean;
  signSubmissions: SignSubmission[];
  distributionPoints: DistributionPoint[];
  pinDropMode: boolean;
  pinPosition: [number, number] | null;
  onPinPlaced: (lat: number, lng: number) => void;
  flyToTarget: { lat: number; lng: number } | null;
  onFlyComplete: () => void;
}

const GREEN = '#16a34a';
const AMBER = '#f59e0b';
const RED = '#dc2626';

/** Build a cluster icon showing green/amber/red proportions. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createClusterIcon(cluster: any): L.DivIcon {
  const children = cluster.getAllChildMarkers();
  const count = children.length;

  let dressedCount = 0;
  let claimedCount = 0;
  for (const child of children) {
    const html = (child.getIcon().options as L.DivIconOptions).html ?? '';
    if (typeof html === 'string') {
      if (html.includes(GREEN)) dressedCount++;
      else if (html.includes(AMBER)) claimedCount++;
    }
  }

  const size = count < 20 ? 36 : count < 100 ? 44 : 52;
  const half = size / 2;

  const availableCount = count - dressedCount - claimedCount;
  let background: string;
  if (dressedCount === count) {
    background = GREEN;
  } else if (claimedCount === count) {
    background = AMBER;
  } else if (availableCount === count) {
    background = RED;
  } else {
    const pctDressed = Math.round((dressedCount / count) * 100);
    const pctClaimed = Math.round(((dressedCount + claimedCount) / count) * 100);
    background = `conic-gradient(${GREEN} 0% ${pctDressed}%, ${AMBER} ${pctDressed}% ${pctClaimed}%, ${RED} ${pctClaimed}% 100%)`;
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

export default function MapView({ markers, dressedIds, claimedIds, dressings, onClaimClick, onConfirmClick, onReportClick, onIncorrectReportClick, hasAccess, signSubmissions, distributionPoints, pinDropMode, pinPosition, onPinPlaced, flyToTarget, onFlyComplete }: MapViewProps) {
  const dressingMap = useMemo(() => {
    const m = new Map<string, DressingRecord>();
    for (const d of dressings) m.set(d.locationId, d);
    return m;
  }, [dressings]);

  const getStatus = useCallback((id: string): LocationStatus => {
    if (dressedIds.has(id)) return 'dressed';
    if (claimedIds.has(id)) return 'claimed';
    return 'available';
  }, [dressedIds, claimedIds]);

  // Force cluster re-render when dressing/claim data changes
  const clusterKey = useMemo(() => {
    const d = Array.from(dressedIds).sort().join(',');
    const c = Array.from(claimedIds).sort().join(',');
    return `${d}|${c}`;
  }, [dressedIds, claimedIds]);

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
            status={getStatus(marker.id)}
            dressing={dressingMap.get(marker.id)}
            onClaimClick={onClaimClick}
            onConfirmClick={onConfirmClick}
            onReportClick={onReportClick}
            onIncorrectReportClick={onIncorrectReportClick}
            hasAccess={hasAccess}
          />
        ))}
      </MarkerClusterGroup>

      {distributionPoints.map((point) => (
        <DistributionPointMarker key={point.id} point={point} />
      ))}

      {signSubmissions.map((sub) => (
        <SignMarker key={sub.id} submission={sub} />
      ))}

      <PinDropHandler active={pinDropMode} pinPosition={pinPosition} onPinPlaced={onPinPlaced} />
      <FlyToLocation target={flyToTarget} onComplete={onFlyComplete} />
    </MapContainer>
  );
}
