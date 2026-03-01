import { useMemo } from 'react';
import { findNearbyUnclaimed, type NearbyLocation } from '../utils/geo';
import { allLocations } from '../config/categorizeLocations';
import type { MapMarker, DressingRecord } from '../types';

export function useNearbyUnclaimed(
  referenceLocation: MapMarker | null,
  dressings: DressingRecord[],
  maxResults = 5,
  maxDistanceMiles = 5,
): NearbyLocation[] {
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
      allLocations,
      claimedOrDressedIds,
      referenceLocation.id,
      maxResults,
      maxDistanceMiles,
    );
  }, [referenceLocation, claimedOrDressedIds, maxResults, maxDistanceMiles]);
}
