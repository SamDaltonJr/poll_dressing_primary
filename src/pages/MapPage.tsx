import { useState, useMemo, useCallback } from 'react';
import MapView from '../components/map/MapView';
import MapFilter from '../components/map/MapFilter';
import SearchBar from '../components/map/SearchBar';
import ClaimModal from '../components/map/ClaimModal';
import ConfirmDressedModal from '../components/map/ConfirmDressedModal';
import ReportModal from '../components/map/ReportModal';
import MissingLocationModal from '../components/map/MissingLocationModal';
import IncorrectLocationModal from '../components/map/IncorrectLocationModal';
import AccessCodeModal from '../components/common/AccessCodeModal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useDressings } from '../hooks/useDressings';
import { useDistributionPoints } from '../hooks/useDistributionPoints';
import { useSubmissions } from '../hooks/useSubmissions';
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
  const { points: distributionPoints, loading: dpLoading } = useDistributionPoints();
  const { submissions: signSubmissions, loading: subsLoading } = useSubmissions();
  const { isValid: hasAccess } = useAccessCode();
  const [activeTypes, setActiveTypes] = useState<Set<MarkerType>>(getDefaultActiveTypes);
  const [showDistributionPoints, setShowDistributionPoints] = useState(true);
  const [showSignPlacements, setShowSignPlacements] = useState(true);
  const [claimTarget, setClaimTarget] = useState<MapMarker | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<MapMarker | null>(null);
  const [reportTarget, setReportTarget] = useState<MapMarker | null>(null);
  const [incorrectTarget, setIncorrectTarget] = useState<MapMarker | null>(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [pinDropMode, setPinDropMode] = useState(false);
  const [pinPosition, setPinPosition] = useState<[number, number] | null>(null);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number } | null>(null);

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

  const claimedIds = useMemo(() => {
    const set = new Set<string>();
    for (const d of dressings) {
      if (d.isClaimed && !d.isDressed) set.add(d.locationId);
    }
    return set;
  }, [dressings]);

  const dressingMap = useMemo(() => {
    const m = new Map<string, typeof dressings[0]>();
    for (const d of dressings) m.set(d.locationId, d);
    return m;
  }, [dressings]);

  const stats = useMemo(() => {
    const s: Record<MarkerType, { total: number; dressed: number; claimed: number }> = {
      dualSite: { total: 0, dressed: 0, claimed: 0 },
      earlyVotingOnly: { total: 0, dressed: 0, claimed: 0 },
      electionDayOnly: { total: 0, dressed: 0, claimed: 0 },
    };
    for (const m of allMarkers) {
      s[m.type].total++;
      if (dressedIds.has(m.id)) s[m.type].dressed++;
      else if (claimedIds.has(m.id)) s[m.type].claimed++;
    }
    return s;
  }, [allMarkers, dressedIds, claimedIds]);

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

  function handleClaimClick(marker: MapMarker) {
    if (hasAccess) {
      setClaimTarget(marker);
    } else {
      setClaimTarget(marker);
      setShowAccessModal(true);
    }
  }

  function handleConfirmClick(marker: MapMarker) {
    if (hasAccess) {
      setConfirmTarget(marker);
    } else {
      setConfirmTarget(marker);
      setShowAccessModal(true);
    }
  }

  function handleAccessSuccess() {
    setShowAccessModal(false);
  }

  function handleReportClick(marker: MapMarker) {
    setReportTarget(marker);
  }

  function handleIncorrectReportClick(marker: MapMarker) {
    setIncorrectTarget(marker);
  }

  function handleStartPinDrop() {
    setPinDropMode(true);
    setPinPosition(null);
  }

  function handlePinPlaced(lat: number, lng: number) {
    setPinPosition([lat, lng]);
  }

  function handleConfirmPin() {
    setPinDropMode(false);
    setShowMissingModal(true);
  }

  function handleCancelPinDrop() {
    setPinDropMode(false);
    setPinPosition(null);
  }

  function handleSearchSelect(marker: MapMarker) {
    setFlyToTarget({ lat: marker.latitude, lng: marker.longitude });
  }

  const handleFlyComplete = useCallback(() => {
    setFlyToTarget(null);
  }, []);

  function handleCloseModals() {
    setClaimTarget(null);
    setConfirmTarget(null);
    setReportTarget(null);
    setIncorrectTarget(null);
    setShowAccessModal(false);
  }

  if (loading || dpLoading || subsLoading) return <LoadingSpinner message="Loading map data..." />;

  const totalDressed = stats.dualSite.dressed + stats.earlyVotingOnly.dressed + stats.electionDayOnly.dressed;
  const totalClaimed = stats.dualSite.claimed + stats.earlyVotingOnly.claimed + stats.electionDayOnly.claimed;
  const totalLocations = stats.dualSite.total + stats.earlyVotingOnly.total + stats.electionDayOnly.total;

  return (
    <div className={`map-page ${pinDropMode ? 'pin-drop-active' : ''}`}>
      <MapView
        markers={filteredMarkers}
        dressedIds={dressedIds}
        claimedIds={claimedIds}
        dressings={dressings}
        onClaimClick={handleClaimClick}
        onConfirmClick={handleConfirmClick}
        onReportClick={handleReportClick}
        onIncorrectReportClick={handleIncorrectReportClick}
        hasAccess={hasAccess}
        signSubmissions={showSignPlacements ? signSubmissions : []}
        distributionPoints={showDistributionPoints ? distributionPoints : []}
        pinDropMode={pinDropMode}
        pinPosition={pinPosition}
        onPinPlaced={handlePinPlaced}
        flyToTarget={flyToTarget}
        onFlyComplete={handleFlyComplete}
      />
      <SearchBar markers={allMarkers} onSelect={handleSearchSelect} />
      <MapFilter
        activeTypes={activeTypes}
        onToggle={handleToggle}
        stats={stats}
        showDistributionPoints={showDistributionPoints}
        onToggleDistributionPoints={() => setShowDistributionPoints((prev) => !prev)}
        distributionPointCount={distributionPoints.length}
        showSignPlacements={showSignPlacements}
        onToggleSignPlacements={() => setShowSignPlacements((prev) => !prev)}
        signPlacementCount={signSubmissions.length}
      />
      {!pinDropMode && (
        <button className="btn btn-primary pin-drop-btn" onClick={handleStartPinDrop}>
          + Report Missing Location
        </button>
      )}

      {pinDropMode && (
        <div className="pin-drop-banner">
          <span>{pinPosition ? 'Pin placed! Drag to adjust, then confirm.' : 'Click the map to place a pin for the missing location.'}</span>
          <div className="pin-drop-banner-actions">
            {pinPosition && (
              <button className="btn btn-primary btn-sm" onClick={handleConfirmPin}>
                Confirm Location
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={handleCancelPinDrop}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="map-legend">
        <span>{totalDressed} dressed</span>
        <span className="legend-sep">&middot;</span>
        <span>{totalClaimed} claimed</span>
        <span className="legend-sep">&middot;</span>
        <span>{totalLocations - totalDressed - totalClaimed} available</span>
        <span className="legend-sep">|</span>
        <span>{totalLocations} locations</span>
        {signSubmissions.length > 0 && (
          <>
            <span className="legend-sep">&middot;</span>
            <span>{signSubmissions.length} sign{signSubmissions.length !== 1 ? 's' : ''}</span>
          </>
        )}
      </div>

      {showAccessModal && (
        <AccessCodeModal
          onSuccess={handleAccessSuccess}
          onClose={handleCloseModals}
        />
      )}

      {claimTarget && !showAccessModal && hasAccess && (
        <ClaimModal
          marker={claimTarget}
          onClose={handleCloseModals}
          onClaimed={() => setClaimTarget(null)}
        />
      )}

      {confirmTarget && !showAccessModal && hasAccess && (
        <ConfirmDressedModal
          marker={confirmTarget}
          dressing={dressingMap.get(confirmTarget.id)!}
          onClose={handleCloseModals}
          onConfirmed={() => setConfirmTarget(null)}
        />
      )}

      {reportTarget && (
        <ReportModal
          marker={reportTarget}
          onClose={() => setReportTarget(null)}
          onReported={() => setReportTarget(null)}
        />
      )}

      {incorrectTarget && (
        <IncorrectLocationModal
          marker={incorrectTarget}
          onClose={() => setIncorrectTarget(null)}
          onSubmitted={() => setIncorrectTarget(null)}
        />
      )}

      {showMissingModal && pinPosition && (
        <MissingLocationModal
          latitude={pinPosition[0]}
          longitude={pinPosition[1]}
          onClose={() => { setShowMissingModal(false); setPinPosition(null); }}
          onSubmitted={() => { setShowMissingModal(false); setPinPosition(null); }}
        />
      )}
    </div>
  );
}
