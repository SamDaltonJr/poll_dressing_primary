import { useNearbyUnclaimed } from '../../hooks/useNearbyUnclaimed';
import { MARKER_TYPES } from '../../config/constants';
import type { MapMarker, DressingRecord } from '../../types';

interface NearbySuggestionsProps {
  referenceLocation: MapMarker;
  dressings: DressingRecord[];
}

export default function NearbySuggestions({ referenceLocation, dressings }: NearbySuggestionsProps) {
  const nearby = useNearbyUnclaimed(referenceLocation, dressings);

  if (nearby.length === 0) {
    return (
      <div className="nearby-suggestions">
        <p className="nearby-empty">All nearby locations are claimed or dressed!</p>
      </div>
    );
  }

  return (
    <div className="nearby-suggestions">
      <h4 className="nearby-heading">Nearby unclaimed locations</h4>
      <ul className="nearby-list">
        {nearby.map((n) => (
          <li key={n.location.id} className="nearby-item">
            <div className="nearby-item-info">
              <span className="nearby-item-name">{n.location.label}</span>
              <span className="nearby-item-address">{n.location.address}</span>
            </div>
            <div className="nearby-item-meta">
              <span className="nearby-item-type">
                {MARKER_TYPES[n.location.type]?.label ?? n.location.type}
              </span>
              <span className="nearby-item-distance">{n.distanceMiles.toFixed(1)} mi</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
