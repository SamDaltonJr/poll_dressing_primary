import { Marker, Popup } from 'react-leaflet';
import { createMarkerIcon, MARKER_TYPES } from '../../config/constants';
import type { MapMarker, DressingRecord, LocationStatus } from '../../types';

interface PollingMarkerProps {
  marker: MapMarker;
  status: LocationStatus;
  dressing?: DressingRecord;
  onClaimClick: (marker: MapMarker) => void;
  onConfirmClick: (marker: MapMarker) => void;
  hasAccess: boolean;
}

const SIZE_LABELS = { S: 'Small', M: 'Medium', L: 'Large' } as const;

const STATUS_LABEL: Record<LocationStatus, string> = {
  available: 'NOT DRESSED',
  claimed: 'CLAIMED',
  dressed: 'DRESSED',
};

export default function PollingMarker({ marker, status, dressing, onClaimClick, onConfirmClick, hasAccess }: PollingMarkerProps) {
  const icon = createMarkerIcon(marker.type, status, marker.size);
  const typeLabel = MARKER_TYPES[marker.type].label;

  return (
    <Marker position={[marker.latitude, marker.longitude]} icon={icon}>
      <Popup maxWidth={280}>
        <div className="marker-popup">
          <div className="marker-popup-info">
            <strong>{marker.label}</strong>
            <p className="marker-popup-address">{marker.address}</p>
            <span className="marker-popup-type">{typeLabel}</span>
            {marker.size && (
              <span className="marker-popup-size"> &middot; {SIZE_LABELS[marker.size]}</span>
            )}
            <div className={`dressing-status ${status}`}>
              {STATUS_LABEL[status]}
            </div>

            {status === 'claimed' && dressing && (
              <p className="marker-popup-volunteer">
                Claimed by {dressing.volunteerName}
                {dressing.claimedAt?.toDate && (
                  <> on {dressing.claimedAt.toDate().toLocaleDateString()}</>
                )}
              </p>
            )}

            {status === 'dressed' && dressing && (
              <>
                <p className="marker-popup-volunteer">
                  Dressed by {dressing.volunteerName}
                  {dressing.dressedAt?.toDate && (
                    <> on {dressing.dressedAt.toDate().toLocaleDateString()}</>
                  )}
                </p>
                {dressing.signCount > 0 && (
                  <p className="marker-popup-signs">
                    {dressing.signCount} sign{dressing.signCount !== 1 ? 's' : ''} placed
                  </p>
                )}
              </>
            )}

            {status === 'available' && (
              <button
                className="btn btn-primary btn-sm marker-popup-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onClaimClick(marker);
                }}
              >
                {hasAccess ? 'Claim This Location' : 'Enter Code to Claim'}
              </button>
            )}

            {status === 'claimed' && hasAccess && (
              <button
                className="btn btn-primary btn-sm marker-popup-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirmClick(marker);
                }}
              >
                Confirm Dressed
              </button>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
