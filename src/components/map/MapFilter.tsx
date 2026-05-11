import { useState } from 'react';
import { MARKER_TYPES } from '../../config/constants';
import type { MarkerType } from '../../types';

type CdScope = 'home' | 'neighbors' | 'all';

interface MapFilterProps {
  activeTypes: Set<MarkerType>;
  onToggle: (type: MarkerType) => void;
  stats: Record<MarkerType, { total: number; dressed: number; claimed: number; retrieved: number }>;
  cdScope: CdScope;
  onChangeCdScope: (scope: CdScope) => void;
  homeDistrict: string;
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

// showSignPlacements / onToggleSignPlacements / signPlacementCount intentionally
// not destructured below — the Sign Placements filter row is hidden for May 26.
// The props stay on MapFilterProps so MapPage keeps passing them; restoring is
// a one-line destructure + the commented <label> block below.
export default function MapFilter({ activeTypes, onToggle, stats, cdScope, onChangeCdScope, homeDistrict, showDistributionPoints, onToggleDistributionPoints, distributionPointCount, showPlannedSigns, onTogglePlannedSigns, plannedSignCount }: MapFilterProps) {
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
      <div className="map-filter-cd-scope" role="radiogroup" aria-label="Congressional district scope">
        <button
          type="button"
          role="radio"
          aria-checked={cdScope === 'home'}
          className={`map-filter-cd-btn ${cdScope === 'home' ? 'active' : ''}`}
          onClick={() => onChangeCdScope('home')}
          title={`Show only ${homeDistrict} polling sites`}
        >
          {homeDistrict}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={cdScope === 'neighbors'}
          className={`map-filter-cd-btn ${cdScope === 'neighbors' ? 'active' : ''}`}
          onClick={() => onChangeCdScope('neighbors')}
          title="Include neighboring districts"
        >
          + Neighbors
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={cdScope === 'all'}
          className={`map-filter-cd-btn ${cdScope === 'all' ? 'active' : ''}`}
          onClick={() => onChangeCdScope('all')}
          title="Show all districts in the campaign's covered counties"
        >
          All
        </button>
      </div>
      <div className="map-filter-separator" />
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
      {/* Sign Placements filter (volunteer big-sign photo submissions) hidden
          for May 26 — the /submit route is disabled and no new T markers can
          be created. Restore this <label> block alongside re-enabling /submit. */}
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
