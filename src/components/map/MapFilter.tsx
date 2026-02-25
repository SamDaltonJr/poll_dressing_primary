import { MARKER_TYPES } from '../../config/constants';
import type { MarkerType } from '../../types';

interface MapFilterProps {
  activeTypes: Set<MarkerType>;
  onToggle: (type: MarkerType) => void;
  counts: Record<MarkerType, number>;
}

export default function MapFilter({ activeTypes, onToggle, counts }: MapFilterProps) {
  return (
    <div className="map-filter">
      {(Object.entries(MARKER_TYPES) as [MarkerType, typeof MARKER_TYPES[MarkerType]][]).map(
        ([type, config]) => (
          <label key={type} className="map-filter-item">
            <input
              type="checkbox"
              checked={activeTypes.has(type)}
              onChange={() => onToggle(type)}
            />
            <span className="filter-dot" style={{ backgroundColor: config.color }} />
            <span className="filter-label">
              {config.label} ({counts[type] || 0})
            </span>
          </label>
        )
      )}
    </div>
  );
}
