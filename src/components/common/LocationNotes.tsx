import type { MapMarker } from '../../types';

/**
 * "Where to go" notes and the last volunteer's tip for a polling site. Renders
 * nothing when the site has neither, so callers can drop it in unconditionally.
 */
export default function LocationNotes({ location }: { location: MapMarker }) {
  if (!location.notes && !location.tip) return null;
  return (
    <div className="location-notes">
      {location.notes && (
        <p className="location-notes-where">
          <span className="location-notes-label">Where to go:</span> {location.notes}
        </p>
      )}
      {location.tip && (
        <p className="location-notes-tip">
          <span className="location-notes-label">Volunteer tip:</span> {location.tip}
          {location.tipBy && <span className="location-notes-by"> — {location.tipBy}</span>}
        </p>
      )}
    </div>
  );
}
