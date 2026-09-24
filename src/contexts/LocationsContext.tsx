import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { subscribeToLocationSets } from '../services/pollingLocationService';
import { isEarlyVotingOpen } from '../config/campaigns';
import { useCampaign } from './CampaignContext';
import type { CampaignConfig } from '../config/campaigns';
import type { MapMarker, MarkerType, PollingLocationSet, StoredLocation } from '../types';

interface LocationsValue {
  /** Every polling site across all imported counties. */
  allLocations: MapMarker[];
  /**
   * Sites still relevant for dressing: everything during early voting; after
   * early voting closes, EV-only sites drop out.
   */
  activeLocations: MapMarker[];
  locationById: Map<string, MapMarker>;
  /** Raw per-county docs, for the admin import screen. */
  sets: PollingLocationSet[];
  loading: boolean;
}

const LocationsCtx = createContext<LocationsValue | null>(null);

function markerType(l: StoredLocation): MarkerType {
  if (l.ev && l.ed) return 'dualSite';
  return l.ev ? 'earlyVotingOnly' : 'electionDayOnly';
}

/**
 * Rank early-voting sites statewide by imported turnout and tag the top ones
 * (CampaignConfig.priority). Priority sites draw large on the map unless an
 * admin set a size by hand.
 */
function applyPriority(markers: MapMarker[], campaign: CampaignConfig): void {
  const cfg = campaign.priority;
  if (!cfg) return;
  const ranked = markers
    .filter((m) => m.type !== 'electionDayOnly' && (m.evTotal ?? 0) > 0)
    .sort((a, b) => b.evTotal! - a.evTotal! || a.label.localeCompare(b.label));
  ranked.forEach((m, i) => {
    m.priorityRank = i + 1;
    if (i < cfg.tier1) m.priorityTier = 1;
    else if (i < cfg.tier2) m.priorityTier = 2;
    if (m.priorityTier && !m.size) m.size = 'L';
  });
}

/**
 * Subscribes once per campaign to the Firestore polling-location sets and
 * shares the flattened marker list with every page, so the map, admin tables
 * and My Locations don't each open their own listener.
 */
export function LocationsProvider({ children }: { children: ReactNode }) {
  const campaign = useCampaign();
  const [sets, setSets] = useState<PollingLocationSet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    return subscribeToLocationSets(
      campaign.slug,
      (next) => {
        setSets(next);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [campaign.slug]);

  const value = useMemo<LocationsValue>(() => {
    const allLocations: MapMarker[] = [];
    for (const set of sets) {
      for (const l of set.locations ?? []) {
        if (!l.ev && !l.ed) continue;
        allLocations.push({
          id: l.id,
          type: markerType(l),
          latitude: l.latitude,
          longitude: l.longitude,
          label: l.label,
          address: l.address,
          size: l.size,
          evTotal: l.evTotal,
          evDem: l.evDem,
          evRep: l.evRep,
          evEstimated: l.evEstimated,
          county: set.county,
          notes: l.notes,
          tip: l.tip,
          tipBy: l.tipBy,
          tipAt: l.tipAt,
        });
      }
    }
    applyPriority(allLocations, campaign);
    const evOpen = isEarlyVotingOpen(campaign);
    const activeLocations = evOpen
      ? allLocations
      : allLocations.filter((l) => l.type !== 'earlyVotingOnly');
    const locationById = new Map(allLocations.map((l) => [l.id, l]));
    return { allLocations, activeLocations, locationById, sets, loading };
  }, [sets, loading, campaign]);

  return <LocationsCtx.Provider value={value}>{children}</LocationsCtx.Provider>;
}

export function useLocations(): LocationsValue {
  const ctx = useContext(LocationsCtx);
  if (!ctx) throw new Error('useLocations must be used inside a LocationsProvider');
  return ctx;
}
