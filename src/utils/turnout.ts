import type { MapMarker } from '../types';

/** "12,345" */
export function formatVotes(n: number): string {
  return n.toLocaleString('en-US');
}

/** Dem share of a site's early vote, when the county split it by party. */
export function demShare(m: Pick<MapMarker, 'evTotal' | 'evDem'>): number | null {
  if (m.evDem == null || !m.evTotal) return null;
  return m.evDem / m.evTotal;
}
