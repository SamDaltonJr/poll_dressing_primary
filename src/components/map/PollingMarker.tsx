import { Marker, Popup } from 'react-leaflet';
import { createMarkerIcon, MARKER_TYPES } from '../../config/constants';
import LocationNotes from '../common/LocationNotes';
import TurnoutLine from '../common/TurnoutLine';
import { directionsToSite } from '../../utils/directions';
import { contactMatches, getVolunteerProfile } from '../../utils/volunteerProfile';
import type { MapMarker, DressingRecord, LocationStatus } from '../../types';

interface PollingMarkerProps {
  marker: MapMarker;
  status: LocationStatus;
  dressing?: DressingRecord;
  onClaimClick: (marker: MapMarker) => void;
  onConfirmClick: (marker: MapMarker) => void;
  onRetrieveClick: (marker: MapMarker) => void;
  onReportClick: (marker: MapMarker) => void;
  onIncorrectReportClick: (marker: MapMarker) => void;
  /** Present for admins who may reposition this site's pin. */
  onMovePinClick?: (marker: MapMarker) => void;
  hasAccess: boolean;
}

/**
 * "you" when the site was claimed with the contact info saved on this device.
 * Its own component so the lookup only runs for an open popup, not for every
 * marker on the map.
 */
function VolunteerName({ dressing }: { dressing: DressingRecord }) {
  const profile = getVolunteerProfile();
  const isMine = [profile.email, profile.phone].some((t) => t && contactMatches(t, dressing));
  return <>{isMine ? 'you' : dressing.volunteerName}</>;
}

const SIZE_LABELS = { S: 'Small', M: 'Medium', L: 'Large' } as const;

const STATUS_LABEL: Record<LocationStatus, string> = {
  available: 'AVAILABLE',
  claimed: 'CLAIMED',
  dressed: 'DRESSED',
  retrieved: 'RETRIEVED',
};

export default function PollingMarker({ marker, status, dressing, onClaimClick, onConfirmClick, onRetrieveClick, onReportClick, onIncorrectReportClick, onMovePinClick, hasAccess }: PollingMarkerProps) {
  const icon = createMarkerIcon(marker.type, status, marker.size, marker.priorityTier);
  // Priority sites draw on top of their neighbors.
  const zIndexOffset = marker.priorityTier === 1 ? 1000 : marker.priorityTier === 2 ? 500 : 0;
  const typeLabel = MARKER_TYPES[marker.type].label;

  return (
    <Marker position={[marker.latitude, marker.longitude]} icon={icon} zIndexOffset={zIndexOffset}>
      {/* Top padding keeps the popup clear of the floating search bar. */}
      <Popup maxWidth={280} autoPanPaddingTopLeft={[12, 72]}>
        <div className="marker-popup">
          <div className="marker-popup-info">
            <strong>{marker.label}</strong>
            <p className="marker-popup-address">{marker.address}</p>
            <span className="marker-popup-type">{typeLabel}</span>
            {marker.size && (
              <span className="marker-popup-size"> &middot; {SIZE_LABELS[marker.size]}</span>
            )}
            <TurnoutLine marker={marker} />
            <LocationNotes location={marker} />
            <div className={`dressing-status ${status}`}>
              {STATUS_LABEL[status]}
            </div>

            {status === 'claimed' && dressing && (
              <p className="marker-popup-volunteer">
                Claimed by <VolunteerName dressing={dressing} />
                {dressing.claimedAt?.toDate && (
                  <> on {dressing.claimedAt.toDate().toLocaleDateString()}</>
                )}
              </p>
            )}

            {status === 'dressed' && dressing && (
              <>
                <p className="marker-popup-volunteer">
                  Dressed by <VolunteerName dressing={dressing} />
                  {dressing.dressedAt?.toDate && (
                    <> on {dressing.dressedAt.toDate().toLocaleDateString()}</>
                  )}
                </p>
                {dressing.signCount > 0 && (
                  <p className="marker-popup-signs">
                    {dressing.signCount} sign{dressing.signCount !== 1 ? 's' : ''} placed
                  </p>
                )}
                {dressing.reportCount > 0 && (
                  <p className="marker-popup-report-warning">
                    Reported {dressing.reportCount} time{dressing.reportCount !== 1 ? 's' : ''}
                  </p>
                )}
                <button
                  className="btn btn-primary btn-sm marker-popup-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetrieveClick(marker);
                  }}
                >
                  {hasAccess ? 'Signs Retrieved' : 'Enter Code to Mark Retrieved'}
                </button>
              </>
            )}

            {status === 'retrieved' && dressing && (
              <>
                <p className="marker-popup-volunteer">
                  Dressed by <VolunteerName dressing={dressing} />
                  {dressing.dressedAt?.toDate && (
                    <> on {dressing.dressedAt.toDate().toLocaleDateString()}</>
                  )}
                </p>
                {dressing.signCount > 0 && (
                  <p className="marker-popup-signs">
                    {dressing.signCount} sign{dressing.signCount !== 1 ? 's' : ''} placed
                  </p>
                )}
                <p className="marker-popup-signs">
                  {dressing.retrievedSignCount} sign{dressing.retrievedSignCount !== 1 ? 's' : ''} retrieved
                  {dressing.retrievedAt?.toDate && (
                    <> on {dressing.retrievedAt.toDate().toLocaleDateString()}</>
                  )}
                </p>
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

            {status === 'claimed' && (
              <button
                className="btn btn-primary btn-sm marker-popup-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirmClick(marker);
                }}
              >
                {hasAccess ? 'Mark as Dressed' : 'Enter Code to Mark Dressed'}
              </button>
            )}
            <div className="marker-popup-actions">
              <a
                className="btn btn-sm marker-popup-link-btn"
                href={directionsToSite(marker)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Directions
              </a>
              {status === 'dressed' && (
                <button
                  className="btn btn-sm marker-popup-link-btn"
                  title="Signs missing, damaged or misplaced"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReportClick(marker);
                  }}
                >
                  Sign problem
                </button>
              )}
              <button
                className="btn btn-sm marker-popup-link-btn"
                title="Wrong address, name or pin location"
                onClick={(e) => {
                  e.stopPropagation();
                  onIncorrectReportClick(marker);
                }}
              >
                Wrong info
              </button>
            </div>
            {onMovePinClick && (
              <button
                className="btn btn-sm marker-popup-move-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onMovePinClick(marker);
                }}
              >
                Move pin (admin)
              </button>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
