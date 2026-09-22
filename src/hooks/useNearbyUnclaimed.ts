import { useMemo } from 'react';
import { findNearbyUnclaimed, type NearbyLocation } from '../utils/geo';
import { useLocations } from '../contexts/LocationsContext';
import type { MapMarker, DressingRecord } from '../types';

export function useNearbyUnclaimed(
  referenceLocation: MapMarker | null,
  dressings: DressingRecord[],
  maxResults = 5,
  maxDistanceMiles = 5,
): NearbyLocation[] {
  const { activeLocations } = useLocations();
  const claimedOrDressedIds = useMemo(() => {
    const set = new Set<string>();
    for (const d of dressings) {
      if (d.isClaimed || d.isDressed) set.add(d.locationId);
    }
    return set;
  }, [dressings]);

  return useMemo(() => {
    if (!referenceLocation) return [];
    return findNearbyUnclaimed(
      referenceLocation.latitude,
      referenceLocation.longitude,
      activeLocations,
      claimedOrDressedIds,
      referenceLocation.id,
      maxResults,
      maxDistanceMiles,
    );
  }, [referenceLocation, activeLocations, claimedOrDressedIds, maxResults, maxDistanceMiles]);
}
