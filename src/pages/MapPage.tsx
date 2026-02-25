import { useState, useMemo } from 'react';
import MapView from '../components/map/MapView';
import MapFilter from '../components/map/MapFilter';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useSubmissions } from '../hooks/useSubmissions';
import { MARKER_TYPES } from '../config/constants';
import pollingLocations from '../config/pollingLocations';
import electionDayLocations from '../config/electionDayLocations';
import type { MapMarker, MarkerType } from '../types';

// Nudge markers that share the same coordinates so they sit side-by-side
// instead of stacking on top of each other.
// Offset is ~30 meters in longitude — enough to see both dots at street-level zoom.
const OFFSET = 0.0003; // ~30m at Dallas latitude

function spreadOverlappingMarkers(markers: MapMarker[]): MapMarker[] {
  const coordKey = (m: MapMarker) =>
    `${m.latitude.toFixed(4)},${m.longitude.toFixed(4)}`;

  // Group markers by rounded coordinate
  const groups = new Map<string, MapMarker[]>();
  for (const m of markers) {
    const key = coordKey(m);
    const arr = groups.get(key) ?? [];
    arr.push(m);
    groups.set(key, arr);
  }

  const result: MapMarker[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      result.push(group[0]);
    } else {
      // Spread markers in a horizontal line around the center
      const half = (group.length - 1) / 2;
      for (let i = 0; i < group.length; i++) {
        result.push({
          ...group[i],
          longitude: group[i].longitude + (i - half) * OFFSET,
        });
      }
    }
  }
  return result;
}

// Initialize active types from the registry defaults
function getDefaultActiveTypes(): Set<MarkerType> {
  const types = new Set<MarkerType>();
  for (const [type, config] of Object.entries(MARKER_TYPES)) {
    if (config.defaultVisible) types.add(type as MarkerType);
  }
  return types;
}

export default function MapPage() {
  const { submissions, loading } = useSubmissions();
  const [activeTypes, setActiveTypes] = useState<Set<MarkerType>>(getDefaultActiveTypes);

  // Convert sign submissions to unified MapMarker format and merge all data sources
  const allMarkers = useMemo<MapMarker[]>(() => {
    const signMarkers: MapMarker[] = submissions.map((sub) => ({
      id: sub.id,
      type: 'sign' as MarkerType,
      latitude: sub.latitude,
      longitude: sub.longitude,
      label: sub.volunteerName,
      address: sub.address,
      photoUrl: sub.photoUrl,
      notes: sub.notes,
    }));

    const combined = [...signMarkers, ...pollingLocations, ...electionDayLocations];
    return spreadOverlappingMarkers(combined);
  }, [submissions]);

  // Count markers per type
  const counts = useMemo(() => {
    const c: Record<MarkerType, number> = { sign: 0, earlyVoting: 0, electionDay: 0 };
    for (const m of allMarkers) {
      c[m.type] = (c[m.type] || 0) + 1;
    }
    return c;
  }, [allMarkers]);

  // Filter markers by active types
  const filteredMarkers = useMemo(
    () => allMarkers.filter((m) => activeTypes.has(m.type)),
    [allMarkers, activeTypes]
  );

  // Split filtered markers: signs always visible (no clustering), polling clustered
  const signMarkers = useMemo(
    () => filteredMarkers.filter((m) => m.type === 'sign'),
    [filteredMarkers]
  );
  const pollingMarkers = useMemo(
    () => filteredMarkers.filter((m) => m.type !== 'sign'),
    [filteredMarkers]
  );

  function handleToggle(type: MarkerType) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  if (loading) return <LoadingSpinner message="Loading map data..." />;

  return (
    <div className="map-page">
      <MapView signMarkers={signMarkers} pollingMarkers={pollingMarkers} />
      <MapFilter activeTypes={activeTypes} onToggle={handleToggle} counts={counts} />
      <div className="map-legend">
        <span>{counts.sign} sign{counts.sign !== 1 ? 's' : ''}</span>
        <span className="legend-sep">|</span>
        <span>{counts.earlyVoting} early voting</span>
        <span className="legend-sep">|</span>
        <span>{counts.electionDay} election day</span>
      </div>
    </div>
  );
}
