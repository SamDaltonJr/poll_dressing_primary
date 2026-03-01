import type { MapMarker, RawMapMarker } from '../types';
import pollingLocations from './pollingLocations';
import electionDayLocations from './electionDayLocations';

/**
 * Normalize a location label for fuzzy matching:
 * lowercase, strip punctuation, collapse whitespace,
 * expand common abbreviations, drop prepositions.
 */
function normalize(label: string): string {
  let s = label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Expand common abbreviations
  s = s
    .replace(/\bassoc\b/g, 'association')
    .replace(/\bcomm\b/g, 'community')
    .replace(/\bctr\b/g, 'center')
    .replace(/\bctrs\b/g, 'centers')
    .replace(/\bsw\b/g, 'southwest')
    .replace(/\bnw\b/g, 'northwest')
    .replace(/\bse\b/g, 'southeast')
    .replace(/\bne\b/g, 'northeast')
    .replace(/\bst\b/g, 'street')
    .replace(/\bblvd\b/g, 'boulevard')
    .replace(/\bdr\b/g, 'drive')
    .replace(/\bpkwy\b/g, 'parkway');

  // Drop prepositions often inconsistently included
  s = s.replace(/\b(in|at|of the|the)\b/g, '');

  // Collapse whitespace again after replacements
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

/**
 * Manual alias map for early voting IDs → election day labels.
 * Covers cases where names are too different for normalization to catch.
 */
const MANUAL_MATCHES: Record<string, string> = {
  'ev-KF004': 'Kemp Sub Courthouse',  // different city but same org — verify if correct
  'ev-DN-124': 'Frisco ISD Transportation West',
};

// Build a set of normalized election-day labels for fast lookup
const edNormalized = new Map<string, RawMapMarker>();
for (const loc of electionDayLocations) {
  edNormalized.set(normalize(loc.label), loc);
}

// Also build by raw label for manual matches
const edByLabel = new Map<string, RawMapMarker>();
for (const loc of electionDayLocations) {
  edByLabel.set(loc.label, loc);
}

// Categorize all locations into three groups
const dualSites: MapMarker[] = [];
const earlyVotingOnly: MapMarker[] = [];
const electionDayOnly: MapMarker[] = [];

// Process early voting locations: check if they also appear in election day
const matchedEdKeys = new Set<string>();
for (const evLoc of pollingLocations) {
  const key = normalize(evLoc.label);

  // Check normalized match first
  let edMatch = edNormalized.get(key);

  // Fall back to manual match if needed
  if (!edMatch && MANUAL_MATCHES[evLoc.id]) {
    edMatch = edByLabel.get(MANUAL_MATCHES[evLoc.id]);
  }

  if (edMatch) {
    // Dual site — use the early voting entry (has size info), but retype
    dualSites.push({ ...evLoc, type: 'dualSite', id: `dual-${evLoc.id}` });
    matchedEdKeys.add(normalize(edMatch.label));
  } else {
    earlyVotingOnly.push({ ...evLoc, type: 'earlyVotingOnly' });
  }
}

// Remaining election day locations that didn't match any early voting site
for (const edLoc of electionDayLocations) {
  const key = normalize(edLoc.label);
  if (!matchedEdKeys.has(key)) {
    electionDayOnly.push({ ...edLoc, type: 'electionDayOnly' });
  }
}

/** All locations categorized into 3 groups, merged into one array */
export const allLocations: MapMarker[] = [
  ...dualSites,
  ...earlyVotingOnly,
  ...electionDayOnly,
];

export { dualSites, earlyVotingOnly, electionDayOnly };

/**
 * Derive county name from a location ID prefix.
 * Early voting IDs: ev-E (Dallas), ev-TC (Tarrant), ev-DN (Denton),
 *   ev-CC (Collin), ev-PK (Parker), ev-EL (Ellis), ev-RW (Rockwall),
 *   ev-KF (Kaufman)
 * Election day IDs: ed-V (Dallas), ed-T (Tarrant), ed-D (Denton),
 *   ed-C (Collin), ed-PK (Parker), ed-EL (Ellis), ed-RW (Rockwall),
 *   ed-KF (Kaufman), ed-JN (Johnson)
 * Dual site IDs: dual-ev-... (same as early voting after stripping prefix)
 */
export function getCounty(id: string): string {
  // Dual sites reuse the early-voting ID after "dual-"
  const raw = id.startsWith('dual-') ? id.slice(5) : id;

  if (raw.startsWith('ev-')) {
    const suffix = raw.slice(3); // after "ev-"
    if (suffix.startsWith('E')) return 'Dallas';
    if (suffix.startsWith('TC')) return 'Tarrant';
    if (suffix.startsWith('DN')) return 'Denton';
    if (suffix.startsWith('CC')) return 'Collin';
    if (suffix.startsWith('PK')) return 'Parker';
    if (suffix.startsWith('EL')) return 'Ellis';
    if (suffix.startsWith('RW')) return 'Rockwall';
    if (suffix.startsWith('KF')) return 'Kaufman';
    if (suffix.startsWith('JN')) return 'Johnson';
  }

  if (raw.startsWith('ed-')) {
    const suffix = raw.slice(3); // after "ed-"
    if (suffix.startsWith('V')) return 'Dallas';
    if (suffix.startsWith('T')) return 'Tarrant';
    if (suffix.startsWith('DN')) return 'Denton';
    if (suffix.startsWith('D')) return 'Denton';
    if (suffix.startsWith('CC')) return 'Collin';
    if (suffix.startsWith('C')) return 'Collin';
    if (suffix.startsWith('PK')) return 'Parker';
    if (suffix.startsWith('EL')) return 'Ellis';
    if (suffix.startsWith('RW')) return 'Rockwall';
    if (suffix.startsWith('KF')) return 'Kaufman';
    if (suffix.startsWith('JN')) return 'Johnson';
  }

  return 'Unknown';
}
