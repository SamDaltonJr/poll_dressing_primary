import { MARKER_TYPES } from '../../config/constants';
import type { MarkerType } from '../../types';

interface MapFilterProps {
  activeTypes: Set<MarkerType>;
  onToggle: (type: MarkerType) => void;
  stats: Record<MarkerType, { total: number; dressed: number; claimed: number }>;
  showDistributionPoints: boolean;
  onToggleDistributionPoints: () => void;
  distributionPointCount: number;
}

export default function MapFilter({ activeTypes, onToggle, stats, showDistributionPoints, onToggleDistributionPoints, distributionPointCount }: MapFilterProps) {
  return (
    <div className="map-filter">
      {(Object.entries(MARKER_TYPES) as [MarkerType, typeof MARKER_TYPES[MarkerType]][]).map(
        ([type, config]) => {
          const s = stats[type] || { total: 0, dressed: 0, claimed: 0 };
          return (
            <label key={type} className="map-filter-item">
              <input
                type="checkbox"
                checked={activeTypes.has(type)}
                onChange={() => onToggle(type)}
              />
              <span className="filter-dot" style={{ backgroundColor: config.color }} />
              <span className="filter-label">{config.label}</span>
              <span className="filter-progress">{s.dressed}/{s.total}</span>
            </label>
          );
        },
      )}
      <div className="map-filter-separator" />
      <label className="map-filter-item">
        <input
          type="checkbox"
          checked={showDistributionPoints}
          onChange={onToggleDistributionPoints}
        />
        <span className="filter-dot filter-dot-diamond" style={{ backgroundColor: '#2563eb' }} />
        <span className="filter-label">Sign Distribution</span>
        <span className="filter-progress">{distributionPointCount}</span>
      </label>
      <div className="filter-legend">
        <span className="filter-dot" style={{ backgroundColor: '#16a34a' }} />
        <span className="filter-legend-label">Dressed</span>
        <span className="filter-dot" style={{ backgroundColor: '#f59e0b', marginLeft: 8 }} />
        <span className="filter-legend-label">Claimed</span>
        <span className="filter-dot" style={{ backgroundColor: '#dc2626', marginLeft: 8 }} />
        <span className="filter-legend-label">Available</span>
        <span className="filter-dot filter-dot-diamond" style={{ backgroundColor: '#2563eb', marginLeft: 8 }} />
        <span className="filter-legend-label">Signs</span>
      </div>
    </div>
  );
}
