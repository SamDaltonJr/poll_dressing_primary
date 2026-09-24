import { TEXAS_REGIONS } from '../../config/texasRegions';

interface RegionPickerProps {
  /** Selected metro area; '' = all of Texas; null = nothing chosen yet. */
  current: string | null;
  /** Polling-location count per metro area, keyed by region name. */
  counts: Record<string, number>;
  /** Polling-location count statewide. */
  totalCount: number;
  onSelect: (region: string) => void;
  /** Present when the picker was opened from the map and can be dismissed. */
  onClose?: () => void;
}

function countLabel(n: number): string {
  if (n === 0) return 'No locations yet';
  return `${n} location${n !== 1 ? 's' : ''}`;
}

export default function RegionPicker({ current, counts, totalCount, onSelect, onClose }: RegionPickerProps) {
  return (
    <div className="region-picker-overlay" onClick={onClose}>
      <div
        className="region-picker"
        role="dialog"
        aria-labelledby="region-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="region-picker-title">Where are you volunteering?</h2>
        <p>Pick your area and the map will zoom to the polling locations near you.</p>
        <div className="region-grid">
          {Object.keys(TEXAS_REGIONS).map((name) => (
            <button
              key={name}
              type="button"
              className={`region-card ${current === name ? 'selected' : ''}`}
              onClick={() => onSelect(name)}
            >
              <span className="region-card-name">{name}</span>
              <span className="region-card-count">{countLabel(counts[name] ?? 0)}</span>
            </button>
          ))}
        </div>
        <div className="region-picker-footer">
          <button
            type="button"
            className={`btn btn-secondary ${current === '' ? 'active' : ''}`}
            onClick={() => onSelect('')}
          >
            All of Texas ({totalCount})
          </button>
          {onClose && (
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
