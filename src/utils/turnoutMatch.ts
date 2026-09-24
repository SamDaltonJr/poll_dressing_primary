/**
 * Matching county turnout reports to stored polling sites by name.
 *
 * Turnout reports list sites by name only (no addresses), and the names drift
 * between a county's turnout report and its published site list ("Comm Ctr"
 * vs "Community Center", "HCPL Octavia Fields Branch Library" vs "Octavia
 * Fields Library"). Scoring blends word overlap with character-pair overlap so
 * both abbreviations and spacing differences ("Sub-Courthouse" vs
 * "Subcourthouse") still score well.
 *
 * No runtime imports, so this can be exercised directly with
 * `node --experimental-strip-types`.
 */

export interface TurnoutRow {
  county: string;
  site: string;
  total: number;
  dem?: number;
  rep?: number;
  estimated?: boolean;
}

export interface SiteRef {
  id: string;
  label: string;
}

export interface SiteMatch {
  /** Index into the county's turnout rows. */
  row: number;
  score: number;
}

/** Scores at or above this are pre-selected; below it the admin must pick. */
export const AUTO_MATCH_SCORE = 0.55;
/** Pairs below this aren't offered as a suggestion at all. */
const MIN_SCORE = 0.3;

const SYNONYMS: Record<string, string> = {
  comm: 'community', cmty: 'community', commty: 'community',
  ctr: 'center', cntr: 'center', centre: 'center', cent: 'center',
  rec: 'recreation', recreational: 'recreation',
  lib: 'library', libr: 'library',
  bldg: 'building', bld: 'building',
  gov: 'government', govt: 'government',
  dept: 'department',
  mun: 'municipal', muni: 'municipal',
  admin: 'administration', adm: 'administration',
  sr: 'senior',
  ft: 'fort',
  mt: 'mount',
  st: 'saint',
  univ: 'university',
  coll: 'college',
  elem: 'elementary',
  hs: 'high',
  ms: 'middle',
  jr: 'junior',
  svc: 'service', svcs: 'services',
  ctny: 'county', cnty: 'county', co: 'county',
  annx: 'annex',
  ch: 'church',
  bapt: 'baptist',
  meth: 'methodist', umc: 'methodist',
  fd: 'fire', fs: 'fire',
  stn: 'station', sta: 'station',
  pk: 'park',
  bch: 'branch',
};

// Words that carry no identity. County names are dropped per county.
const STOPWORDS = new Set([
  'the', 'of', 'at', 'a', 'and', 'in', 'on', 'for',
  'branch', 'public', 'county', 'main', 'site', 'early', 'voting', 'ev', 'location',
  'hcpl', 'bldg', 'building', 'room', 'rm', 'suite', 'ste', 'school',
]);

// Kinds of facility. Two names sharing only these ("Lucas Community Center" /
// "Josephine Community Center") are a guess, never an automatic match.
const FACILITY_WORDS = new Set([
  'community', 'center', 'recreation', 'library', 'city', 'town', 'hall', 'civic',
  'municipal', 'government', 'administration', 'annex', 'complex', 'office', 'courthouse',
  'subcourthouse', 'court', 'courts', 'church', 'baptist', 'methodist', 'united', 'first',
  'university', 'college', 'campus', 'high', 'middle', 'elementary', 'isd', 'texas',
  'senior', 'activity', 'event', 'events', 'park', 'fire', 'station', 'department',
  'multiservice', 'service', 'services', 'health', 'medical', 'north', 'south', 'east',
  'west', 'northeast', 'northwest', 'southeast', 'southwest', 'central', 'new', 'old',
]);

function tokens(label: string, county: string): string[] {
  const countyWords = new Set(county.toLowerCase().split(/\s+/));
  return label
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ') // "(Main Early Voting Site)"
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9#]+/g, ' ')
    .replace(/#\s*/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((t) => SYNONYMS[t] ?? t)
    // Dallas prefixes vote-center codes ("E0050 Dallas County Records Bldg").
    .filter((t) => !STOPWORDS.has(t) && !countyWords.has(t) && !/^[a-z]\d{3,}$/.test(t));
}

function bigrams(s: string): Map<string, number> {
  const out = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2);
    out.set(g, (out.get(g) ?? 0) + 1);
  }
  return out;
}

function dice<T>(a: Map<T, number>, b: Map<T, number>): number {
  let inter = 0;
  let size = 0;
  for (const [k, n] of a) {
    inter += Math.min(n, b.get(k) ?? 0);
    size += n;
  }
  for (const n of b.values()) size += n;
  return size ? (2 * inter) / size : 0;
}

/** Same word, allowing a typo in longer words ("Aranda" / "Arranda"). */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 5 || b.length < 5) return false;
  return dice(bigrams(a), bigrams(b)) >= 0.75;
}

/**
 * Word weights for one county: words that show up in many of the county's
 * names ("community", "center", "library") say little about which site it is.
 */
function wordWeights(names: string[][]): (t: string) => number {
  const df = new Map<string, number>();
  for (const ts of names) for (const t of new Set(ts)) df.set(t, (df.get(t) ?? 0) + 1);
  const n = Math.max(names.length, 1);
  return (t) => Math.log(1 + n / (df.get(t) ?? 1));
}

function score(a: string[], b: string[], weight: (t: string) => number): number {
  if (!a.length || !b.length) return 0;
  // "Fire Station 5" must never match "Fire Station 8".
  const na = a.filter((t) => /^\d+$/.test(t));
  const nb = b.filter((t) => /^\d+$/.test(t));
  if (na.length && nb.length && !na.some((n) => nb.includes(n))) return 0;

  // Weighted word overlap.
  let shared = 0;
  let sharesName = false;
  const usedB = new Set<number>();
  for (const t of a) {
    const j = b.findIndex((u, i) => !usedB.has(i) && sameWord(t, u));
    if (j === -1) continue;
    usedB.add(j);
    shared += weight(t) + weight(b[j]);
    if (!FACILITY_WORDS.has(t)) sharesName = true;
  }
  const total = a.reduce((s, t) => s + weight(t), 0) + b.reduce((s, t) => s + weight(t), 0);
  const wordScore = total ? shared / total : 0;
  if (wordScore === 0) {
    // No word in common. Only a near-identical spelling with the spaces moved
    // ("Sub-Courthouse" / "Subcourthouse") is worth offering.
    const g = dice(bigrams(a.join('')), bigrams(b.join('')));
    return g >= 0.8 ? g * 0.7 : 0;
  }
  const gramScore = dice(bigrams(a.join('')), bigrams(b.join('')));
  // One name fully inside the other ("Scarsdale Annex" in "Harris County
  // Scarsdale Annex") is strong evidence even when the lengths differ a lot.
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  const isContained = short.every((t) => long.some((u) => sameWord(t, u)));
  if (isContained && short.length === long.length) return 1;
  // "University Park UMC" inside "University Park UMC Room 101" identifies the
  // site even though every shared word is a facility word.
  if (isContained && short.length >= 2) sharesName = true;
  const s = Math.min(1, 0.6 * wordScore + 0.4 * gramScore + (sharesName && isContained ? 0.15 : 0));
  // Scale rather than cap so the better of two guesses still pairs first.
  return sharesName ? s : s * 0.5;
}

/**
 * Pair each stored site with at most one turnout row (and vice versa), best
 * scores first. Returns a map of site id → match, including weak suggestions
 * below AUTO_MATCH_SCORE that the UI should leave unselected.
 */
export function matchCounty(sites: SiteRef[], rows: Pick<TurnoutRow, 'site'>[], county: string): Map<string, SiteMatch> {
  const ts = sites.map((s) => tokens(s.label, county));
  const tr = rows.map((r) => tokens(r.site, county));
  const weight = wordWeights([...ts, ...tr]);
  const pairs: Array<{ s: number; r: number; score: number }> = [];
  ts.forEach((a, s) => tr.forEach((b, r) => {
    const sc = score(a, b, weight);
    if (sc >= MIN_SCORE) pairs.push({ s, r, score: sc });
  }));
  pairs.sort((x, y) => y.score - x.score);
  const usedSites = new Set<number>();
  const usedRows = new Set<number>();
  const out = new Map<string, SiteMatch>();
  for (const p of pairs) {
    if (usedSites.has(p.s) || usedRows.has(p.r)) continue;
    usedSites.add(p.s);
    usedRows.add(p.r);
    out.set(sites[p.s].id, { row: p.r, score: p.score });
  }
  return out;
}
