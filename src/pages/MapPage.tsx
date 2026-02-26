import { useState, useMemo } from 'react';
import MapView from '../components/map/MapView';
import MapFilter from '../components/map/MapFilter';
import DressingModal from '../components/map/DressingModal';
import AccessCodeModal from '../components/common/AccessCodeModal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useDressings } from '../hooks/useDressings';
import { useAccessCode } from '../hooks/useAccessCode';
import { MARKER_TYPES } from '../config/constants';
import { allLocations } from '../config/categorizeLocations';
import type { MapMarker, MarkerType } from '../types';

const OFFSET = 0.0003;

function spreadOverlappingMarkers(markers: MapMarker[]): MapMarker[] {
  const coordKey = (m: MapMarker) =>
    `${m.latitude.toFixed(4)},${m.longitude.toFixed(4)}`;

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

function getDefaultActiveTypes(): Set<MarkerType> {
  const types = new Set<MarkerType>();
  for (const [type, config] of Object.entries(MARKER_TYPES)) {
    if (config.defaultVisible) types.add(type as MarkerType);
  }
  return types;
}

export default function MapPage() {
  const { dressings, loading } = useDressings();
  const { isValid: hasAccess } = useAccessCode();
  const [activeTypes, setActiveTypes] = useState<Set<MarkerType>>(getDefaultActiveTypes);
  const [dressingTarget, setDressingTarget] = useState<MapMarker | null>(null);
  const [showAccessModal, setShowAccessModal] = useState(false);

  const allMarkers = useMemo<MapMarker[]>(() => {
    return spreadOverlappingMarkers(allLocations);
  }, []);

  const dressedIds = useMemo(() => {
    const set = new Set<string>();
    for (const d of dressings) {
      if (d.isDressed) set.add(d.locationId);
    }
    return set;
  }, [dressings]);

  const stats = useMemo(() => {
    const s: Record<MarkerType, { total: number; dressed: number }> = {
      dualSite: { total: 0, dressed: 0 },
      earlyVotingOnly: { total: 0, dressed: 0 },
      electionDayOnly: { total: 0, dressed: 0 },
    };
    for (const m of allMarkers) {
      s[m.type].total++;
      if (dressedIds.has(m.id)) s[m.type].dressed++;
    }
    return s;
  }, [allMarkers, dressedIds]);

  const filteredMarkers = useMemo(
    () => allMarkers.filter((m) => activeTypes.has(m.type)),
    [allMarkers, activeTypes],
  );

  function handleToggle(type: MarkerType) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function handleDressClick(marker: MapMarker) {
    if (hasAccess) {
      setDressingTarget(marker);
    } else {
      setDressingTarget(marker);
      setShowAccessModal(true);
    }
  }

  function handleAccessSuccess() {
    setShowAccessModal(false);
  }

  function handleDressed() {
    setDressingTarget(null);
  }

  function handleCloseModals() {
    setDressingTarget(null);
    setShowAccessModal(false);
  }

  if (loading) return <LoadingSpinner message="Loading map data..." />;

  const totalDressed = stats.dualSite.dressed + stats.earlyVotingOnly.dressed + stats.electionDayOnly.dressed;
  const totalLocations = stats.dualSite.total + stats.earlyVotingOnly.total + stats.electionDayOnly.total;

  return (
    <div className="map-page">
      <MapView
        markers={filteredMarkers}
        dressedIds={dressedIds}
        dressings={dressings}
        onDressClick={handleDressClick}
        hasAccess={hasAccess}
      />
      <MapFilter activeTypes={activeTypes} onToggle={handleToggle} stats={stats} />
      <div className="map-legend">
        <span>{totalDressed}/{totalLocations} sites dressed</span>
        <span className="legend-sep">|</span>
        <span>{stats.dualSite.dressed}/{stats.dualSite.total} EV+ED</span>
        <span className="legend-sep">|</span>
        <span>{stats.earlyVotingOnly.dressed}/{stats.earlyVotingOnly.total} EV only</span>
        <span className="legend-sep">|</span>
        <span>{stats.electionDayOnly.dressed}/{stats.electionDayOnly.total} ED only</span>
      </div>

      {showAccessModal && (
        <AccessCodeModal
          onSuccess={handleAccessSuccess}
          onClose={handleCloseModals}
        />
      )}

      {dressingTarget && !showAccessModal && hasAccess && (
        <DressingModal
          marker={dressingTarget}
          onClose={handleCloseModals}
          onDressed={handleDressed}
        />
      )}
    </div>
  );
}
