/**
 * Campaign registry. Each entry defines a self-contained branded view of the app.
 *
 * To add a campaign:
 *  1. Pick a URL slug (kebab-case). The slug is also the Firestore campaignId, so
 *     never rename a live campaign's slug — its data would be orphaned.
 *  2. Optionally drop a logo file into src/assets/logos/ and import it below — Vite
 *     will hash and bundle it. Don't hotlink campaign-site URLs; they're a
 *     reliability risk. Without a logo the header/picker fall back to initials.
 *  3. Add brand colors. scripts/extract-logo-colors.mjs pulls dominant colors from
 *     a PNG/JPEG/WebP logo.
 *  4. Create the campaignSettings/{slug} doc in Firestore with accessCodeHash and
 *     adminPasswordHash (see scripts/hash-secret.mjs).
 */

export interface CampaignContact {
  name: string;
  phone?: string;
  email?: string;
}

export interface CampaignConfig {
  slug: string;
  candidateName: string;
  candidateLastName: string;
  raceLabel: string;
  /** Short label for the election, shown in the header and picker (e.g. "Nov 3 General"). */
  electionLabel: string;
  /** First/last day of in-person early voting and election day (local dates). */
  earlyVotingStart?: Date;
  earlyVotingEnd?: Date;
  electionDay?: Date;
  tagline: string;
  /** Primary brand color — overrides --color-primary on the layout root. */
  primaryColor: string;
  primaryHoverColor: string;
  /** Accent / contrast color (gold or red, typically). */
  accentColor: string;
  /** Optional. If absent, the picker card and header fall back to candidate initials. */
  logoUrl?: string;
  websiteUrl: string;
  /** Coordinators listed on instruction pages and in reminder emails. */
  contacts?: CampaignContact[];
  /** Signal/group-chat invite link included in reminder emails. */
  groupChatUrl?: string;
  /**
   * Turns on big-sign tracking: the Big Sign tab and submit form, sign-placement
   * and planned-sign map layers, their admin tabs, and the big-sign sections of
   * My Locations. Off by default — the general election is poll dressing only.
   */
  bigSigns?: boolean;
  /**
   * Ranks early-voting sites statewide by their imported turnout (evTotal) and
   * flags the top ones. `tier1`/`tier2` are counts: the top `tier1` sites are
   * Priority 1, the next ones up to rank `tier2` are Priority 2.
   * `sourceLabel` names the election the numbers came from, for popups.
   */
  priority?: { tier1: number; tier2: number; sourceLabel: string };
  /**
   * Marks this entry as a frozen archive — past campaign whose data lives in a
   * separate Firebase project. Picker renders an external link to archiveUrl
   * instead of a /c/:slug SPA route, and CampaignProvider redirects /c/:slug
   * direct access to the archive URL.
   */
  isArchive?: boolean;
  /**
   * Path (relative to import.meta.env.BASE_URL) of the archive deploy. Required
   * when isArchive is true. e.g. "talarico-archive/".
   */
  archiveUrl?: string;
}

// Talarico placeholder brand colors, shared by the live campaign and the
// primary archive card. Swap in official hex codes if/when available.
const TALARICO_PRIMARY = '#1B4D89';
const TALARICO_PRIMARY_HOVER = '#143A6A';
const TALARICO_ACCENT = '#C8102E';

export const CAMPAIGNS: Record<string, CampaignConfig> = {
  'talarico-senate': {
    slug: 'talarico-senate',
    candidateName: 'James Talarico',
    candidateLastName: 'Talarico',
    raceLabel: 'U.S. Senate — Texas',
    electionLabel: 'Nov 3 General',
    // 2026 general: early voting Mon Oct 19 – Fri Oct 30, election day Tue Nov 3.
    earlyVotingStart: new Date(2026, 9, 19),
    earlyVotingEnd: new Date(2026, 9, 30),
    electionDay: new Date(2026, 10, 3),
    tagline: 'Statewide sign and poll-dressing effort for the November general election.',
    primaryColor: TALARICO_PRIMARY,
    primaryHoverColor: TALARICO_PRIMARY_HOVER,
    accentColor: TALARICO_ACCENT,
    websiteUrl: 'https://www.jamestalarico.com/',
    contacts: [
      { name: 'Sam Dalton', phone: '(214) 686-8608', email: 'spdaltonjr@gmail.com' },
      { name: 'Rob Strobel', phone: '(859) 489-8880', email: 'rob@jamestalarico.com' },
    ],
    groupChatUrl: 'https://signal.group/#CjQKIHhfB6WLSDlvTqFuh65yUP59TvR5oCAx_2N-YKDJCkBYEhDxr0HAooGF_E6BH7OWHgZ2',
    priority: { tier1: 50, tier2: 150, sourceLabel: 'March primary' },
  },
  'james-talarico-senate': {
    slug: 'james-talarico-senate',
    candidateName: 'James Talarico',
    candidateLastName: 'Talarico',
    raceLabel: 'U.S. Senate Democratic Primary',
    electionLabel: 'March 2026 Primary',
    tagline: 'Volunteer effort for the March 2026 primary. Read-only archive.',
    primaryColor: TALARICO_PRIMARY,
    primaryHoverColor: TALARICO_PRIMARY_HOVER,
    accentColor: TALARICO_ACCENT,
    websiteUrl: 'https://www.jamestalarico.com/',
    isArchive: true,
    archiveUrl: 'talarico-archive/',
  },
};

export function getCampaign(slug: string | undefined): CampaignConfig | null {
  if (!slug) return null;
  return CAMPAIGNS[slug] ?? null;
}

export function listCampaigns(): CampaignConfig[] {
  return Object.values(CAMPAIGNS);
}

/** Two-letter initials from a candidate's full name, for the no-logo fallback. */
export function candidateInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/**
 * True through the last day of early voting (local time). Drives the default map
 * filter (EV view vs. election-day view) and whether EV-only sites count as active.
 * Campaigns without an EV end date are treated as always in the EV window.
 */
export function isEarlyVotingOpen(campaign: CampaignConfig, now: Date = new Date()): boolean {
  if (!campaign.earlyVotingEnd) return true;
  return now <= endOfDay(campaign.earlyVotingEnd);
}
