import { useState, useMemo, useCallback, useEffect } from 'react';
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
import { markSignRetrieved } from '../services/submissionService';
import { useDressings } from '../hooks/useDressings';
import { useDistributionPoints } from '../hooks/useDistributionPoints';
import { useSubmissions } from '../hooks/useSubmissions';
import { usePlannedSigns } from '../hooks/usePlannedSigns';
import { useAccessCode } from '../hooks/useAccessCode';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { EARLY_VOTING_END_DATE } from '../config/constants';
import { allLocations } from '../config/categorizeLocations';
import { useCampaign } from '../contexts/CampaignContext';
import { isWithinAnyMiles } from '../utils/geo';
import type { MapMarker, MarkerType, SignSubmission } from '../types';

/** Volunteer-controlled CD scope toggle (default home, expand to neighbors or all). */
type CdScope = 'home' | 'neighbors' | 'all';

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
function getDefaultActiveTypes(): Set<MarkerType> {
  const earlyVotingOpen = new Date() <= endOfDay(EARLY_VOTING_END_DATE);
  return new Set<MarkerType>(
    earlyVotingOpen
      ? ['dualSite', 'earlyVotingOnly']
      : ['dualSite', 'electionDayOnly'],
  );
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export default function MapPage() {
  const campaign = useCampaign();
  const { dressings, loading } = useDressings();
  const { points: distributionPoints, loading: dpLoading } = useDistributionPoints();
  const { submissions: signSubmissions, loading: subsLoading } = useSubmissions();
  const { signs: plannedSigns, loading: psLoading } = usePlannedSigns();
  const { isValid: hasAccessFromHook } = useAccessCode();
  const { isAdmin } = useAdminAuth();
  const [localAccess, setLocalAccess] = useState(false);
  const hasAccess = hasAccessFromHook || localAccess;
  const [activeTypes, setActiveTypes] = useState<Set<MarkerType>>(getDefaultActiveTypes);
  const [cdScope, setCdScope] = useState<CdScope>('home');
  const [neighborRadius, setNeighborRadius] = useState<number>(
    () => campaign.neighborRadiusMiles ?? 2,
  );
  const [showDistributionPoints, setShowDistributionPoints] = useState(true);
  const [showSignPlacements, setShowSignPlacements] = useState(true);
  const [showPlannedSigns, setShowPlannedSigns] = useState(false);
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

  // Reset CD scope to the campaign's home district when the active campaign
  // changes — otherwise navigating from one campaign's "All" view into another
  // would leak the previous selection into the new home district default.
  useEffect(() => {
    setCdScope('home');
    setNeighborRadius(campaign.neighborRadiusMiles ?? 2);
  }, [campaign.slug, campaign.neighborRadiusMiles]);

  // Campaign-wide hard limit: counties this campaign covers. Falls back to
  // defaultCounties from campaign config until campaignSettings is wired to
  // Firestore (see todo). Empty set = no limit.
  // Active campaigns always set defaultCounties; archive entries don't, but we
  // never render MapPage for archives (CampaignProvider redirects them out).
  const enabledCounties = useMemo(
    () => new Set(campaign.defaultCounties ?? []),
    [campaign.defaultCounties],
  );

  // Home-district polling locations, used as anchor points for distance-based
  // "+ Neighbors" scope. Empty when scope isn't 'neighbors', the campaign has
  // no radius configured, or no home district is set — those cases bypass the
  // distance scan entirely.
  const home = campaign.homeDistrict;
  // Volunteer-adjustable via the slider in MapFilter; campaign config supplies
  // the initial value. Falsy when the campaign hasn't opted into distance-based
  // neighbors — in that case we fall back to the curated district list.
  const radiusMiles = campaign.neighborRadiusMiles ? neighborRadius : undefined;
  const useRadiusForNeighbors = cdScope === 'neighbors' && !!radiusMiles && !!home;

  const homeAnchors = useMemo<Array<readonly [number, number]>>(() => {
    if (!useRadiusForNeighbors) return [];
    return allLocations
      .filter((l) => l.congressionalDistrict === home)
      .map((l) => [l.latitude, l.longitude] as const);
  }, [useRadiusForNeighbors, home]);

  // Legacy district-set fallback — used for 'neighbors' when no radius is set,
  // and also drives the strict 'home' view (single-entry set).
  const enabledCDs = useMemo<Set<string> | null>(() => {
    if (cdScope === 'all') return null;
    const s = new Set<string>();
    if (home) s.add(home);
    if (cdScope === 'neighbors' && !radiusMiles) {
      for (const d of campaign.neighboringDistricts ?? []) s.add(d);
    }
    return s;
  }, [cdScope, home, radiusMiles, campaign.neighboringDistricts]);

  const scopedLocations = useMemo<MapMarker[]>(() => {
    return allLocations.filter((loc) => {
      // County filter (campaign hard limit). Locations missing baked county
      // data pass through — the bake covers all 948 known locations today.
      if (enabledCounties.size > 0 && loc.county && !enabledCounties.has(loc.county)) {
        return false;
      }
      // CD filter (volunteer toggle). Locations missing baked CD data pass
      // through so they never silently disappear.
      if (cdScope === 'all') return true;
      if (!loc.congressionalDistrict) return true;
      if (home && loc.congressionalDistrict === home) return true;
      if (cdScope === 'home') return false;
      // 'neighbors' — prefer distance scan if the campaign opted in, else fall
      // back to the curated district list.
      if (useRadiusForNeighbors) {
        return isWithinAnyMiles(loc.latitude, loc.longitude, homeAnchors, radiusMiles!);
      }
      return !!enabledCDs && enabledCDs.has(loc.congressionalDistrict);
    });
  }, [enabledCounties, cdScope, home, useRadiusForNeighbors, homeAnchors, radiusMiles, enabledCDs]);

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

  if (loading || dpLoading || subsLoading || psLoading) return <LoadingSpinner message="Loading map data..." />;

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
      />
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
        cdScope={cdScope}
        onChangeCdScope={setCdScope}
        homeDistrict={campaign.homeDistrict ?? ''}
        neighborRadius={neighborRadius}
        onChangeNeighborRadius={setNeighborRadius}
        radiusSliderEnabled={!!campaign.neighborRadiusMiles}
        showDistributionPoints={showDistributionPoints}
        onToggleDistributionPoints={() => setShowDistributionPoints((prev) => !prev)}
        distributionPointCount={distributionPoints.length}
        showSignPlacements={showSignPlacements}
        onToggleSignPlacements={() => setShowSignPlacements((prev) => !prev)}
        signPlacementCount={signSubmissions.length}
        showPlannedSigns={showPlannedSigns}
        onTogglePlannedSigns={() => setShowPlannedSigns((prev) => !prev)}
        plannedSignCount={plannedSigns.length}
      />

      {isAdmin && !pinDropMode && !adminPinDropMode && (
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
