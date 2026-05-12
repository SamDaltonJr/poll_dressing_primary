/**
 * Campaign registry. Each entry defines a self-contained branded view of the app.
 *
 * To add a campaign:
 *  1. Pick a URL slug (kebab-case).
 *  2. Drop a logo file into src/assets/logos/ and import it below — Vite will hash
 *     and bundle it. Don't hotlink campaign-site URLs; they're a reliability risk.
 *  3. Add brand colors. Extracted from the campaign logos via
 *     scripts/extract-logo-colors.mjs (PNG/JPEG/WebP) or by grepping hex codes
 *     directly out of the SVG source.
 *  4. Set homeDistrict — used as the default congressional-district filter on the
 *     map and to decide which neighboring districts surface in the "neighbors" toggle.
 */

import johnsonLogo from '../assets/logos/johnson.svg';
import burgeLogo from '../assets/logos/burge.png';

export interface CampaignConfig {
  slug: string;
  candidateName: string;
  candidateLastName: string;
  raceLabel: string;
  /**
   * Home congressional district code, e.g. "TX-33". Drives default map filter.
   * Required for active campaigns; optional on archive entries since their
   * picker card just links out to a frozen deploy.
   */
  homeDistrict?: string;
  /**
   * Districts adjacent to the home district. Used by the "+ Neighbors" map
   * toggle as a fallback when neighborRadiusMiles is not set.
   */
  neighboringDistricts?: string[];
  /**
   * Preferred shape of the "+ Neighbors" filter: include any out-of-district
   * polling location within this radius of a home-district polling location.
   * When set, supersedes neighboringDistricts for that toggle.
   */
  neighborRadiusMiles?: number;
  /**
   * Counties this campaign covers by default — used as the fallback when no
   * campaignSettings doc exists in Firestore yet. Admins can override via the
   * Coverage section in /admin. County names match the strings baked into each
   * polling location at build time (e.g. "Dallas", "Tarrant").
   */
  defaultCounties?: string[];
  tagline: string;
  /** Primary brand color — overrides --color-primary on the layout root. */
  primaryColor: string;
  primaryHoverColor: string;
  /** Accent / contrast color (gold or red, typically). */
  accentColor: string;
  /** Optional. If absent, the picker card falls back to candidate initials. */
  logoUrl?: string;
  websiteUrl: string;
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

export const CAMPAIGNS: Record<string, CampaignConfig> = {
  'julie-johnson': {
    slug: 'julie-johnson',
    candidateName: 'Julie Johnson',
    candidateLastName: 'Johnson',
    raceLabel: 'TX-33 Congressional Democratic Primary',
    homeDistrict: 'TX-33',
    neighboringDistricts: ['TX-32', 'TX-30', 'TX-12', 'TX-24', 'TX-6'],
    neighborRadiusMiles: 5,
    defaultCounties: ['Dallas'],
    tagline: 'When Texans are on the line, Julie never backs down.',
    // Hex codes pulled directly from JulieJohnson_Logo-1.svg fill attributes.
    primaryColor: '#0E3C72',
    primaryHoverColor: '#0A2E58',
    accentColor: '#D0A63D',
    logoUrl: johnsonLogo,
    websiteUrl: 'https://juliejohnson.com/',
  },
  'kevin-burge': {
    slug: 'kevin-burge',
    candidateName: 'Kevin Burge',
    candidateLastName: 'Burge',
    raceLabel: 'TX-24 Congressional Democratic Primary',
    homeDistrict: 'TX-24',
    neighboringDistricts: ['TX-26', 'TX-12', 'TX-32', 'TX-33', 'TX-30'],
    neighborRadiusMiles: 5,
    defaultCounties: ['Dallas', 'Tarrant'],
    tagline: 'Fighting for a better future in the 24th District of Texas.',
    // Hex codes pulled by scripts/extract-logo-colors.mjs from the BURGE FOR CONGRESS PNG.
    // Top dominant non-white color was #112255 (20% of pixels); red star peaked at #DD3333.
    primaryColor: '#112255',
    primaryHoverColor: '#0B1A40',
    accentColor: '#DD3333',
    logoUrl: burgeLogo,
    websiteUrl: 'https://www.burgeforcongress.com/',
  },
  'james-talarico-senate': {
    slug: 'james-talarico-senate',
    candidateName: 'James Talarico',
    candidateLastName: 'Talarico',
    raceLabel: 'U.S. Senate Democratic Primary',
    tagline: 'Statewide volunteer effort, March 2026 primary. Read-only archive.',
    // Placeholder colors — swap in actual Talarico campaign hex codes if/when available.
    // Drop a logo into src/assets/logos/talarico.svg and import it to override the
    // initials fallback shown by CampaignPickerPage.
    primaryColor: '#1B4D89',
    primaryHoverColor: '#143A6A',
    accentColor: '#C8102E',
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
