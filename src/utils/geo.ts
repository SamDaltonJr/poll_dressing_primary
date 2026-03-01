import type { MapMarker } from '../types';

const EARTH_RADIUS_MILES = 3958.8;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Calculate distance between two lat/lng points using the Haversine formula. Returns miles. */
export function haversineDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

export interface NearbyLocation {
  location: MapMarker;
  distanceMiles: number;
}

/** Find nearby unclaimed locations sorted by distance from a reference point. */
export function findNearbyUnclaimed(
  refLat: number,
  refLon: number,
  allLocations: MapMarker[],
  claimedOrDressedIds: Set<string>,
  excludeId: string,
  maxResults = 5,
  maxDistanceMiles = 5,
): NearbyLocation[] {
  const results: NearbyLocation[] = [];

  for (const loc of allLocations) {
    if (loc.id === excludeId || claimedOrDressedIds.has(loc.id)) continue;
    const dist = haversineDistanceMiles(refLat, refLon, loc.latitude, loc.longitude);
    if (dist <= maxDistanceMiles) {
      results.push({ location: loc, distanceMiles: dist });
    }
  }

  results.sort((a, b) => a.distanceMiles - b.distanceMiles);
  return results.slice(0, maxResults);
}
