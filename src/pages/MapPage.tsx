import { useState, useMemo, useCallback } from 'react';
import MapView from '../components/map/MapView';
import MapFilter from '../components/map/MapFilter';
import SearchBar from '../components/map/SearchBar';
import ClaimModal from '../components/map/ClaimModal';
import ConfirmDressedModal from '../components/map/ConfirmDressedModal';
import ConfirmRetrievedModal from '../components/map/ConfirmRetrievedModal';
import ReportModal from '../components/map/ReportModal';
import MissingLocationModal from '../components/map/MissingLocationModal';
import IncorrectLocationModal from '../components/map/IncorrectLocationModal';
import AccessCodeModal from '../components/common/AccessCodeModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PlannedSignModal from '../components/admin/PlannedSignModal';
import RegionPicker from '../components/map/RegionPicker';
import { markSignRetrieved } from '../services/submissionService';
import { useDressings } from '../hooks/useDressings';
import { useDistributionPoints } from '../hooks/useDistributionPoints';
import { useSubmissions } from '../hooks/useSubmissions';
import { usePlannedSigns } from '../hooks/usePlannedSigns';
import { useAccessCode } from '../hooks/useAccessCode';
import { useAdminAuth } from '../contexts/AdminContext';
import { useCampaign } from '../contexts/CampaignContext';
import { useLocations } from '../contexts/LocationsContext';
import { isEarlyVotingOpen, type CampaignConfig } from '../config/campaigns';
import { findCounty } from '../config/texasCounties';
import { TEXAS_REGIONS, TEXAS_BBOX, regionBbox } from '../config/texasRegions';
import type { MapMarker, MarkerType, SignSubmission } from '../types';

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

/**
 * Default polling-site filter, picked from today's date. Through the last day
 * of early voting we open on the EV view (dual + EV-only); the next day we
 * switch to the ED view (dual + ED-only). Volunteers can still toggle either
 * group on after load — this only seeds the initial state.
 */
function getDefaultActiveTypes(campaign: CampaignConfig): Set<MarkerType> {
  return new Set<MarkerType>(
    isEarlyVotingOpen(campaign)
      ? ['dualSite', 'earlyVotingOnly']
      : ['dualSite', 'electionDayOnly'],
  );
}

/** Remembered county filter, per campaign. Storage can throw in private mode. */
function countyStorageKey(slug: string): string {
  return `mapCounty:${slug}`;
}

function readSavedCounty(slug: string): string {
  try {
    return localStorage.getItem(countyStorageKey(slug)) ?? '';
  } catch {
    return '';
  }
}

/**
 * Remembered metro-area choice, per campaign. null = never chosen (volunteers
 * get the picker); '' = "All of Texas" was chosen explicitly.
 */
function regionStorageKey(slug: string): string {
  return `mapRegion:${slug}`;
}

function readSavedRegion(slug: string): string | null {
  try {
    return localStorage.getItem(regionStorageKey(slug));
  } catch {
    return null;
  }
}

export default function MapPage() {
  const campaign = useCampaign();
  const { dressings, loading } = useDressings();
  const { points: distributionPoints, loading: dpLoading } = useDistributionPoints();
  const { submissions: signSubmissions, loading: subsLoading } = useSubmissions();
  const { signs: plannedSigns, loading: psLoading } = usePlannedSigns();
  const { allLocations, loading: locationsLoading } = useLocations();
  const { isValid: hasAccessFromHook } = useAccessCode();
  const { isAdmin, sessionLoading } = useAdminAuth();
  const [localAccess, setLocalAccess] = useState(false);
  const hasAccess = hasAccessFromHook || localAccess;
  const [activeTypes, setActiveTypes] = useState<Set<MarkerType>>(() => getDefaultActiveTypes(campaign));
  const [region, setRegion] = useState<string | null>(() => readSavedRegion(campaign.slug));
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [county, setCounty] = useState<string>(() => readSavedCounty(campaign.slug));
  const [fitBoundsTarget, setFitBoundsTarget] = useState<[number, number, number, number] | null>(null);
  const [showDistributionPoints, setShowDistributionPoints] = useState(true);
  const [showSignPlacements, setShowSignPlacements] = useState(true);
  const [showPlannedSigns, setShowPlannedSigns] = useState(false);
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [searchOpen, setSearchOpen] = useState(() => window.innerWidth > 640);
  const [claimTarget, setClaimTarget] = useState<MapMarker | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<MapMarker | null>(null);
  const [retrieveTarget, setRetrieveTarget] = useState<MapMarker | null>(null);
  const [signRetrieveTarget, setSignRetrieveTarget] = useState<SignSubmission | null>(null);
  const [reportTarget, setReportTarget] = useState<MapMarker | null>(null);
  const [incorrectTarget, setIncorrectTarget] = useState<MapMarker | null>(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [pinDropMode, setPinDropMode] = useState(false);
  const [pinPosition, setPinPosition] = useState<[number, number] | null>(null);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [adminPinDropMode, setAdminPinDropMode] = useState(false);
  const [adminPinPosition, setAdminPinPosition] = useState<[number, number] | null>(null);
  const [showPlannedSignModal, setShowPlannedSignModal] = useState(false);
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number } | null>(null);

  // A remembered region name that no longer exists in config falls back to
  // all of Texas. Volunteers who have never chosen get the picker; admins
  // (once their session has resolved) default to the full map.
  const effectiveRegion = region && TEXAS_REGIONS[region] ? region : '';
  const regionCounties = useMemo(
    () => (effectiveRegion ? new Set(TEXAS_REGIONS[effectiveRegion]) : null),
    [effectiveRegion],
  );
  const showRegionPicker = regionPickerOpen || (region === null && !isAdmin && !sessionLoading);

  // Polling-location counts per metro area, for the picker grid.
  const regionCounts = useMemo(() => {
    const byCounty = new Map<string, number>();
    for (const l of allLocations) byCounty.set(l.county, (byCounty.get(l.county) ?? 0) + 1);
    const counts: Record<string, number> = {};
    for (const [name, counties] of Object.entries(TEXAS_REGIONS)) {
      counts[name] = counties.reduce((sum, c) => sum + (byCounty.get(c) ?? 0), 0);
    }
    return counts;
  }, [allLocations]);

  const regionLocations = useMemo<MapMarker[]>(
    () => (regionCounties ? allLocations.filter((l) => regionCounties.has(l.county)) : allLocations),
    [allLocations, regionCounties],
  );

  // Counties that have polling locations imported (within the chosen region),
  // for the filter dropdown.
  const countyOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of regionLocations) counts.set(l.county, (counts.get(l.county) ?? 0) + 1);
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [regionLocations]);

  // A remembered county that no longer has data (or sits outside the chosen
  // region) falls back to the whole region rather than showing an empty map.
  const effectiveCounty = county && countyOptions.some((c) => c.name === county) ? county : '';

  const scopedLocations = useMemo<MapMarker[]>(
    () => (effectiveCounty ? regionLocations.filter((l) => l.county === effectiveCounty) : regionLocations),
    [regionLocations, effectiveCounty],
  );

  function handleChangeRegion(next: string) {
    setRegion(next);
    setRegionPickerOpen(false);
    try {
      localStorage.setItem(regionStorageKey(campaign.slug), next);
    } catch {
      // Private mode — the choice just won't be remembered.
    }
    // A county filter from another region no longer applies.
    if (county && next && !TEXAS_REGIONS[next].includes(county)) {
      setCounty('');
      try {
        localStorage.removeItem(countyStorageKey(campaign.slug));
      } catch {
        // ignore
      }
    }
    setFitBoundsTarget(next ? regionBbox(next) : TEXAS_BBOX);
  }

  function handleChangeCounty(next: string) {
    setCounty(next);
    try {
      if (next) localStorage.setItem(countyStorageKey(campaign.slug), next);
      else localStorage.removeItem(countyStorageKey(campaign.slug));
    } catch {
      // Private mode — the filter just won't be remembered.
    }
    const info = findCounty(next);
    if (info) setFitBoundsTarget(info.bbox);
  }

  const allMarkers = useMemo<MapMarker[]>(() => {
    return spreadOverlappingMarkers(scopedLocations);
  }, [scopedLocations]);

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

  const retrievedIds = useMemo(() => {
    const set = new Set<string>();
    for (const d of dressings) {
      if (d.isRetrieved) set.add(d.locationId);
    }
    return set;
  }, [dressings]);

  const dressingMap = useMemo(() => {
    const m = new Map<string, typeof dressings[0]>();
    for (const d of dressings) m.set(d.locationId, d);
    return m;
  }, [dressings]);

  const stats = useMemo(() => {
    const s: Record<MarkerType, { total: number; dressed: number; claimed: number; retrieved: number }> = {
      dualSite: { total: 0, dressed: 0, claimed: 0, retrieved: 0 },
      earlyVotingOnly: { total: 0, dressed: 0, claimed: 0, retrieved: 0 },
      electionDayOnly: { total: 0, dressed: 0, claimed: 0, retrieved: 0 },
    };
    for (const m of allMarkers) {
      s[m.type].total++;
      if (retrievedIds.has(m.id)) s[m.type].retrieved++;
      else if (dressedIds.has(m.id)) s[m.type].dressed++;
      else if (claimedIds.has(m.id)) s[m.type].claimed++;
    }
    return s;
  }, [allMarkers, retrievedIds, dressedIds, claimedIds]);

  const priorityStats = useMemo(() => {
    let total = 0;
    let dressed = 0;
    for (const m of allMarkers) {
      if (!m.priorityTier) continue;
      total++;
      if (dressedIds.has(m.id) || retrievedIds.has(m.id)) dressed++;
    }
    return { total, dressed };
  }, [allMarkers, dressedIds, retrievedIds]);

  const filteredMarkers = useMemo(
    () => allMarkers.filter((m) => activeTypes.has(m.type) && (!priorityOnly || m.priorityTier)),
    [allMarkers, activeTypes, priorityOnly],
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

  function handleRetrieveClick(marker: MapMarker) {
    if (hasAccess) {
      setRetrieveTarget(marker);
    } else {
      setRetrieveTarget(marker);
      setShowAccessModal(true);
    }
  }

  function handleSignRetrieveClick(submission: SignSubmission) {
    if (hasAccess) {
      setSignRetrieveTarget(submission);
    } else {
      setSignRetrieveTarget(submission);
      setShowAccessModal(true);
    }
  }

  async function handleConfirmSignRetrieve() {
    if (!signRetrieveTarget) return;
    try {
      await markSignRetrieved(signRetrieveTarget.id);
    } catch {
      alert('Failed to mark sign as retrieved.');
    } finally {
      setSignRetrieveTarget(null);
    }
  }

  function handleAccessSuccess() {
    setShowAccessModal(false);
    setLocalAccess(true);
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

  function handleStartAdminPinDrop() {
    setAdminPinDropMode(true);
    setAdminPinPosition(null);
  }

  function handleAdminPinPlaced(lat: number, lng: number) {
    setAdminPinPosition([lat, lng]);
  }

  function handleConfirmAdminPin() {
    setAdminPinDropMode(false);
    setShowPlannedSignModal(true);
  }

  function handleCancelAdminPinDrop() {
    setAdminPinDropMode(false);
    setAdminPinPosition(null);
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
    setRetrieveTarget(null);
    setSignRetrieveTarget(null);
    setReportTarget(null);
    setIncorrectTarget(null);
    setShowAccessModal(false);
  }

  if (loading || dpLoading || subsLoading || psLoading || locationsLoading) return <LoadingSpinner message="Loading map data..." />;

  const totalDressed = stats.dualSite.dressed + stats.earlyVotingOnly.dressed + stats.electionDayOnly.dressed;
  const totalClaimed = stats.dualSite.claimed + stats.earlyVotingOnly.claimed + stats.electionDayOnly.claimed;
  const totalRetrieved = stats.dualSite.retrieved + stats.earlyVotingOnly.retrieved + stats.electionDayOnly.retrieved;
  const totalLocations = stats.dualSite.total + stats.earlyVotingOnly.total + stats.electionDayOnly.total;

  return (
    <div className={`map-page ${(pinDropMode || adminPinDropMode) ? 'pin-drop-active' : ''}`}>
      <MapView
        markers={filteredMarkers}
        dressedIds={dressedIds}
        claimedIds={claimedIds}
        retrievedIds={retrievedIds}
        dressings={dressings}
        onClaimClick={handleClaimClick}
        onConfirmClick={handleConfirmClick}
        onRetrieveClick={handleRetrieveClick}
        onReportClick={handleReportClick}
        onIncorrectReportClick={handleIncorrectReportClick}
        onSignRetrieveClick={handleSignRetrieveClick}
        hasAccess={hasAccess}
        signSubmissions={showSignPlacements ? signSubmissions : []}
        distributionPoints={showDistributionPoints ? distributionPoints : []}
        plannedSigns={showPlannedSigns ? plannedSigns : []}
        pinDropMode={pinDropMode}
        pinPosition={pinPosition}
        onPinPlaced={handlePinPlaced}
        adminPinDropMode={adminPinDropMode}
        adminPinPosition={adminPinPosition}
        onAdminPinPlaced={handleAdminPinPlaced}
        flyToTarget={flyToTarget}
        onFlyComplete={handleFlyComplete}
        fitBoundsTarget={fitBoundsTarget}
      />
      {allLocations.length === 0 && (
        <div className="map-notice" role="status">
          Polling locations are being added county by county as each county publishes its list.
          {campaign.bigSigns && ' Big sign placements can be logged anywhere in Texas now.'}
        </div>
      )}
      <button
        className="search-toggle"
        onClick={() => setSearchOpen((prev) => !prev)}
        aria-label={searchOpen ? 'Hide search' : 'Show search'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>
      {searchOpen && <SearchBar markers={allMarkers} onSelect={handleSearchSelect} />}
      <MapFilter
        activeTypes={activeTypes}
        onToggle={handleToggle}
        stats={stats}
        county={effectiveCounty}
        onChangeCounty={handleChangeCounty}
        allCountiesLabel={effectiveRegion ? `All of ${effectiveRegion}` : 'All of Texas'}
        countyOptions={countyOptions}
        showDistributionPoints={showDistributionPoints}
        onToggleDistributionPoints={() => setShowDistributionPoints((prev) => !prev)}
        distributionPointCount={distributionPoints.length}
        showSignPlacements={showSignPlacements}
        onToggleSignPlacements={() => setShowSignPlacements((prev) => !prev)}
        signPlacementCount={signSubmissions.length}
        showPlannedSigns={showPlannedSigns}
        onTogglePlannedSigns={() => setShowPlannedSigns((prev) => !prev)}
        plannedSignCount={plannedSigns.length}
        priorityOnly={priorityOnly}
        onTogglePriorityOnly={() => setPriorityOnly((prev) => !prev)}
        priorityStats={priorityStats}
      />

      {isAdmin && campaign.bigSigns && !pinDropMode && !adminPinDropMode && (
        <button className="btn btn-secondary admin-pin-drop-btn" onClick={handleStartAdminPinDrop}>
          + Plan Sign Location
        </button>
      )}

      {!pinDropMode && !adminPinDropMode && (
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

      {adminPinDropMode && (
        <div className="pin-drop-banner" style={{ borderColor: '#7c3aed' }}>
          <span>{adminPinPosition ? 'Pin placed! Drag to adjust, then confirm.' : 'Click the map to place a planned sign location.'}</span>
          <div className="pin-drop-banner-actions">
            {adminPinPosition && (
              <button className="btn btn-primary btn-sm" onClick={handleConfirmAdminPin}>
                Confirm Location
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={handleCancelAdminPinDrop}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="map-legend">
        <button
          type="button"
          className="region-chip"
          onClick={() => setRegionPickerOpen(true)}
          title="Change region"
        >
          {effectiveRegion || 'All of Texas'}
          <span className="region-chip-change">Change</span>
        </button>
        <span className="legend-sep">|</span>
        <span>{totalRetrieved} retrieved</span>
        <span className="legend-sep">&middot;</span>
        <span>{totalDressed} dressed</span>
        <span className="legend-sep">&middot;</span>
        <span>{totalClaimed} claimed</span>
        <span className="legend-sep">&middot;</span>
        <span>{totalLocations - totalDressed - totalClaimed - totalRetrieved} available</span>
        <span className="legend-sep">|</span>
        <span>{totalLocations} locations</span>
        {signSubmissions.length > 0 && (
          <>
            <span className="legend-sep">&middot;</span>
            <span>{signSubmissions.length} sign{signSubmissions.length !== 1 ? 's' : ''}</span>
          </>
        )}
        {plannedSigns.length > 0 && (
          <>
            <span className="legend-sep">&middot;</span>
            <span>{plannedSigns.filter((s) => s.status === 'planned').length} planned</span>
          </>
        )}
      </div>

      {showRegionPicker && (
        <RegionPicker
          current={region}
          counts={regionCounts}
          totalCount={allLocations.length}
          onSelect={handleChangeRegion}
          onClose={region !== null ? () => setRegionPickerOpen(false) : undefined}
        />
      )}

      {showAccessModal && (
        <AccessCodeModal
          onSuccess={handleAccessSuccess}
          onClose={handleCloseModals}
        />
      )}

      {claimTarget && !showAccessModal && hasAccess && (
        <ClaimModal
          marker={claimTarget}
          dressings={dressings}
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

      {retrieveTarget && !showAccessModal && hasAccess && (
        <ConfirmRetrievedModal
          marker={retrieveTarget}
          dressing={dressingMap.get(retrieveTarget.id)!}
          onClose={handleCloseModals}
          onConfirmed={() => setRetrieveTarget(null)}
        />
      )}

      {signRetrieveTarget && !showAccessModal && hasAccess && (
        <ConfirmDialog
          message={`Mark the sign at "${signRetrieveTarget.address}" as retrieved?`}
          confirmLabel="Confirm Retrieved"
          onConfirm={handleConfirmSignRetrieve}
          onCancel={() => setSignRetrieveTarget(null)}
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

      {showPlannedSignModal && adminPinPosition && (
        <PlannedSignModal
          latitude={adminPinPosition[0]}
          longitude={adminPinPosition[1]}
          onClose={() => { setShowPlannedSignModal(false); setAdminPinPosition(null); }}
          onSaved={() => { setShowPlannedSignModal(false); setAdminPinPosition(null); }}
        />
      )}
    </div>
  );
}
