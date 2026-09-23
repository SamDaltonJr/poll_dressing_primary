import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { subscribeToLocationSets } from '../services/pollingLocationService';
import { isEarlyVotingOpen } from '../config/campaigns';
import { useCampaign } from './CampaignContext';
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
          county: set.county,
          notes: l.notes,
          tip: l.tip,
          tipBy: l.tipBy,
          tipAt: l.tipAt,
        });
      }
    }
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
