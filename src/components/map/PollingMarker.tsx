import { Marker, Popup } from 'react-leaflet';
import { createMarkerIcon, MARKER_TYPES } from '../../config/constants';
import type { MapMarker, DressingRecord } from '../../types';

interface PollingMarkerProps {
  marker: MapMarker;
  isDressed: boolean;
  dressing?: DressingRecord;
  onDressClick: (marker: MapMarker) => void;
  hasAccess: boolean;
}

const SIZE_LABELS = { S: 'Small', M: 'Medium', L: 'Large' } as const;

export default function PollingMarker({ marker, isDressed, dressing, onDressClick, hasAccess }: PollingMarkerProps) {
  const icon = createMarkerIcon(marker.type, isDressed, marker.size);
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
            <div className={`dressing-status ${isDressed ? 'dressed' : 'undressed'}`}>
              {isDressed ? 'DRESSED' : 'NOT DRESSED'}
            </div>
            {isDressed && dressing && (
              <p className="marker-popup-volunteer">
                Dressed by {dressing.volunteerName}
                {dressing.dressedAt?.toDate && (
                  <> on {dressing.dressedAt.toDate().toLocaleDateString()}</>
                )}
              </p>
            )}
            {!isDressed && (
              <button
                className="btn btn-primary btn-sm marker-popup-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDressClick(marker);
                }}
              >
                {hasAccess ? 'Mark as Dressed' : 'Enter Code to Dress'}
              </button>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
