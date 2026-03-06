import { useState } from 'react';
import { MARKER_TYPES } from '../../config/constants';
import type { MarkerType } from '../../types';

interface MapFilterProps {
  activeTypes: Set<MarkerType>;
  onToggle: (type: MarkerType) => void;
  stats: Record<MarkerType, { total: number; dressed: number; claimed: number; retrieved: number }>;
  showDistributionPoints: boolean;
  onToggleDistributionPoints: () => void;
  distributionPointCount: number;
  showSignPlacements: boolean;
  onToggleSignPlacements: () => void;
  signPlacementCount: number;
  showPlannedSigns: boolean;
  onTogglePlannedSigns: () => void;
  plannedSignCount: number;
}

export default function MapFilter({ activeTypes, onToggle, stats, showDistributionPoints, onToggleDistributionPoints, distributionPointCount, showSignPlacements, onToggleSignPlacements, signPlacementCount, showPlannedSigns, onTogglePlannedSigns, plannedSignCount }: MapFilterProps) {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth <= 640);

  if (collapsed) {
    return (
      <button
        className="map-filter-toggle"
        onClick={() => setCollapsed(false)}
        title="Show legend"
        aria-label="Show map legend"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      </button>
    );
  }

  return (
    <div className="map-filter">
      <button
        className="map-filter-collapse"
        onClick={() => setCollapsed(true)}
        title="Minimize legend"
        aria-label="Minimize map legend"
      >
        &times;
      </button>
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
      <label className="map-filter-item">
        <input
          type="checkbox"
          checked={showSignPlacements}
          onChange={onToggleSignPlacements}
        />
        <span className="filter-dot filter-dot-sign" />
        <span className="filter-label">Sign Placements</span>
        <span className="filter-progress">{signPlacementCount}</span>
      </label>
      <label className="map-filter-item">
        <input
          type="checkbox"
          checked={showPlannedSigns}
          onChange={onTogglePlannedSigns}
        />
        <span className="filter-dot filter-dot-planned" />
        <span className="filter-label">Planned Signs</span>
        <span className="filter-progress">{plannedSignCount}</span>
      </label>
      <div className="filter-legend">
        <span className="filter-dot" style={{ backgroundColor: '#7c3aed' }} />
        <span className="filter-legend-label">Retrieved</span>
        <span className="filter-dot" style={{ backgroundColor: '#16a34a', marginLeft: 8 }} />
        <span className="filter-legend-label">Dressed</span>
        <span className="filter-dot" style={{ backgroundColor: '#f59e0b', marginLeft: 8 }} />
        <span className="filter-legend-label">Claimed</span>
        <span className="filter-dot" style={{ backgroundColor: '#dc2626', marginLeft: 8 }} />
        <span className="filter-legend-label">Available</span>
        <span className="filter-dot filter-dot-diamond" style={{ backgroundColor: '#2563eb', marginLeft: 8 }} />
        <span className="filter-legend-label">Signs</span>
        <span className="filter-dot filter-dot-planned" style={{ marginLeft: 8 }} />
        <span className="filter-legend-label">Planned</span>
      </div>
    </div>
  );
}
