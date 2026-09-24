import { useMemo, useCallback } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import PollingMarker from './PollingMarker';
import SignMarker from './SignMarker';
import DistributionPointMarker from './DistributionPointMarker';
import PlannedSignMarker from './PlannedSignMarker';
import PinDropHandler from './PinDropHandler';
import FlyToLocation from './FlyToLocation';
import FitBounds from './FitBounds';
import UserLocationMarker from './UserLocationMarker';
import MovePinHandler from './MovePinHandler';
import {
  MAP_CENTER, MAP_ZOOM, TILE_URL, TILE_ATTRIBUTION, SATELLITE_TILE_URL, SATELLITE_LABELS_URL, SATELLITE_ATTRIBUTION,
} from '../../config/constants';
import type { MapMarker, DressingRecord, DistributionPoint, SignSubmission, PlannedSignLocation, LocationStatus } from '../../types';

interface MapViewProps {
  markers: MapMarker[];
  dressedIds: Set<string>;
  claimedIds: Set<string>;
  retrievedIds: Set<string>;
  dressings: DressingRecord[];
  onClaimClick: (marker: MapMarker) => void;
  onConfirmClick: (marker: MapMarker) => void;
  onRetrieveClick: (marker: MapMarker) => void;
  onReportClick: (marker: MapMarker) => void;
  onIncorrectReportClick: (marker: MapMarker) => void;
  onSignRetrieveClick: (submission: SignSubmission) => void;
  hasAccess: boolean;
  signSubmissions: SignSubmission[];
  distributionPoints: DistributionPoint[];
  plannedSigns: PlannedSignLocation[];
  pinDropMode: boolean;
  pinPosition: [number, number] | null;
  onPinPlaced: (lat: number, lng: number) => void;
  adminPinDropMode: boolean;
  adminPinPosition: [number, number] | null;
  onAdminPinPlaced: (lat: number, lng: number) => void;
  flyToTarget: { lat: number; lng: number } | null;
  onFlyComplete: () => void;
  fitBoundsTarget: [number, number, number, number] | null;
  /** A polling pin an admin is repositioning (shown draggable, outside the clusters). */
  movingPin: [number, number] | null;
  onMovePin: (lat: number, lng: number) => void;
  /** Admins only: offered from the popup when set. */
  onMovePinClick?: (marker: MapMarker) => void;
  satellite: boolean;
}

const PURPLE = '#7c3aed';
const GREEN = '#16a34a';
const AMBER = '#f59e0b';
const RED = '#dc2626';

/** Build a cluster icon showing green/amber/red proportions. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createClusterIcon(cluster: any): L.DivIcon {
  const children = cluster.getAllChildMarkers();
  const count = children.length;

  let retrievedCount = 0;
  let dressedCount = 0;
  let claimedCount = 0;
  for (const child of children) {
    const html = (child.getIcon().options as L.DivIconOptions).html ?? '';
    if (typeof html === 'string') {
      if (html.includes(PURPLE)) retrievedCount++;
      else if (html.includes(GREEN)) dressedCount++;
      else if (html.includes(AMBER)) claimedCount++;
    }
  }

  const size = count < 20 ? 36 : count < 100 ? 44 : 52;
  const half = size / 2;

  const availableCount = count - retrievedCount - dressedCount - claimedCount;
  let background: string;
  if (retrievedCount === count) {
    background = PURPLE;
  } else if (dressedCount === count) {
    background = GREEN;
  } else if (claimedCount === count) {
    background = AMBER;
  } else if (availableCount === count) {
    background = RED;
  } else {
    const pctRetrieved = Math.round((retrievedCount / count) * 100);
    const pctDressed = Math.round(((retrievedCount + dressedCount) / count) * 100);
    const pctClaimed = Math.round(((retrievedCount + dressedCount + claimedCount) / count) * 100);
    background = `conic-gradient(${PURPLE} 0% ${pctRetrieved}%, ${GREEN} ${pctRetrieved}% ${pctDressed}%, ${AMBER} ${pctDressed}% ${pctClaimed}%, ${RED} ${pctClaimed}% 100%)`;
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

export default function MapView({ markers, dressedIds, claimedIds, retrievedIds, dressings, onClaimClick, onConfirmClick, onRetrieveClick, onReportClick, onIncorrectReportClick, onSignRetrieveClick, hasAccess, signSubmissions, distributionPoints, plannedSigns, pinDropMode, pinPosition, onPinPlaced, adminPinDropMode, adminPinPosition, onAdminPinPlaced, flyToTarget, onFlyComplete, fitBoundsTarget, movingPin, onMovePin, onMovePinClick, satellite }: MapViewProps) {
  const dressingMap = useMemo(() => {
    const m = new Map<string, DressingRecord>();
    for (const d of dressings) m.set(d.locationId, d);
    return m;
  }, [dressings]);

  const getStatus = useCallback((id: string): LocationStatus => {
    if (retrievedIds.has(id)) return 'retrieved';
    if (dressedIds.has(id)) return 'dressed';
    if (claimedIds.has(id)) return 'claimed';
    return 'available';
  }, [retrievedIds, dressedIds, claimedIds]);

  // Force cluster re-render when dressing/claim data changes
  const clusterKey = useMemo(() => {
    const r = Array.from(retrievedIds).sort().join(',');
    const d = Array.from(dressedIds).sort().join(',');
    const c = Array.from(claimedIds).sort().join(',');
    return `${r}|${d}|${c}`;
  }, [retrievedIds, dressedIds, claimedIds]);

  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={MAP_ZOOM}
      className="map-container"
    >
      {satellite ? (
        <>
          <TileLayer key="sat" url={SATELLITE_TILE_URL} attribution={SATELLITE_ATTRIBUTION} maxZoom={20} maxNativeZoom={19} />
          <TileLayer key="sat-labels" url={SATELLITE_LABELS_URL} maxZoom={20} maxNativeZoom={19} />
        </>
      ) : (
        <TileLayer key="street" url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      )}

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
            onRetrieveClick={onRetrieveClick}
            onReportClick={onReportClick}
            onIncorrectReportClick={onIncorrectReportClick}
            onMovePinClick={onMovePinClick}
            hasAccess={hasAccess}
          />
        ))}
      </MarkerClusterGroup>

      {distributionPoints.map((point) => (
        <DistributionPointMarker key={point.id} point={point} />
      ))}

      {/* Statewide sign placements can run into the thousands, so they get
          their own (default-styled) cluster group separate from polling sites. */}
      <MarkerClusterGroup chunkedLoading disableClusteringAtZoom={13} maxClusterRadius={50}>
        {signSubmissions.map((sub) => (
          <SignMarker key={sub.id} submission={sub} onRetrieveClick={onSignRetrieveClick} hasAccess={hasAccess} />
        ))}
      </MarkerClusterGroup>

      {plannedSigns.map((sign) => (
        <PlannedSignMarker key={sign.id} sign={sign} />
      ))}

      <UserLocationMarker />
      <PinDropHandler active={pinDropMode} pinPosition={pinPosition} onPinPlaced={onPinPlaced} />
      <PinDropHandler active={adminPinDropMode} pinPosition={adminPinPosition} onPinPlaced={onAdminPinPlaced} />
      <FlyToLocation target={flyToTarget} onComplete={onFlyComplete} />
      <FitBounds bbox={fitBoundsTarget} />
      {movingPin && <MovePinHandler position={movingPin} onMove={onMovePin} />}
    </MapContainer>
  );
}
