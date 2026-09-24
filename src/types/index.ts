import { Timestamp } from 'firebase/firestore';

// Marker type system — categorized types used in the app
export type MarkerType = 'dualSite' | 'earlyVotingOnly' | 'electionDayOnly';

// Location status for the claim → dressed → retrieved flow
export type LocationStatus = 'available' | 'claimed' | 'dressed' | 'retrieved';

export type LocationSize = 'S' | 'M' | 'L';

export interface MarkerTypeConfig {
  label: string;
  color: string;
  claimedColor: string;
  dressedColor: string;
  retrievedColor: string;
}

/**
 * A polling site as stored inside a county's pollingLocationSets doc. One entry
 * per physical site: `ev`/`ed` flag which lists (early voting, election day) it
 * appeared in. IDs are assigned at import time and reused on re-import when a
 * row matches an existing site, so dressing records stay attached.
 */
export interface StoredLocation {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  ev: boolean;
  ed: boolean;
  size?: LocationSize;
  /** In-person early votes at this site in the reference election (all parties). */
  evTotal?: number;
  /** Democratic / Republican share of evTotal, when the county split it by party. */
  evDem?: number;
  evRep?: number;
  /** evTotal is an estimate (partial report scaled up, or another election). */
  evEstimated?: boolean;
  /**
   * Where the voting actually happens at the site ("Fellowship Hall, Room 104,
   * enter from the back lot"). From the county list or an admin edit.
   */
  notes?: string;
  /** Advice left by a volunteer who dressed the site, for the next one. */
  tip?: string;
  tipBy?: string;
  /** Epoch ms. Array entries can't hold serverTimestamp(). */
  tipAt?: number;
}

/** The editable note fields on a StoredLocation. */
/** The turnout fields on a StoredLocation, as written by the turnout import. */
export type TurnoutPatch = Pick<StoredLocation, 'evTotal' | 'evDem' | 'evRep' | 'evEstimated'>;

/** Statewide priority tier from turnout rank (see CampaignConfig.priority). */
export type PriorityTier = 1 | 2;

export type LocationNotesPatch = Partial<Pick<StoredLocation, 'notes' | 'tip' | 'tipBy' | 'tipAt'>>;

/**
 * All polling sites for one county. Doc ID: `${campaignId}__${countySlug}`.
 * Storing a county per doc keeps statewide map loads at ≤254 reads.
 */
export interface PollingLocationSet {
  id: string;
  campaignId: string;
  county: string;
  locations: StoredLocation[];
  evUpdatedAt: Timestamp | null;
  edUpdatedAt: Timestamp | null;
  updatedAt: Timestamp | null;
  updatedBy: string;
}

/** Categorized location used throughout the app */
export interface MapMarker {
  id: string;
  type: MarkerType;
  latitude: number;
  longitude: number;
  label: string;
  address: string;
  size?: LocationSize;
  evTotal?: number;
  evDem?: number;
  evRep?: number;
  evEstimated?: boolean;
  /** 1-based statewide rank by evTotal among early-voting sites. */
  priorityRank?: number;
  priorityTier?: PriorityTier;
  county: string;
  notes?: string;
  tip?: string;
  tipBy?: string;
  tipAt?: number;
}

// Dressing records stored in Firestore.
// Doc ID is a composite: `${campaignId}__${locationId}` so each campaign has
// its own dressing record per polling location.
export interface DressingRecord {
  campaignId: string;
  locationId: string;
  isClaimed: boolean;
  claimedAt: Timestamp | null;
  isDressed: boolean;
  signCount: number;
  volunteerName: string;
  volunteerPhone: string;
  volunteerEmail: string;
  dressedAt: Timestamp;
  dressedBy: 'volunteer' | 'admin';
  revertedAt: Timestamp | null;
  revertedBy: string | null;
  isRetrieved: boolean;
  retrievedAt: Timestamp | null;
  retrievedSignCount: number;
  reportCount: number;
  lastReportedAt: Timestamp | null;
  lastReportReason: string | null;
  updatedAt: Timestamp;
}

export interface DressingInput {
  volunteerName: string;
  volunteerPhone: string;
  volunteerEmail: string;
}

/** A sign distribution point, fully managed in Firestore */
export interface DistributionPoint {
  id: string;
  campaignId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  /** Texas county the point falls in, resolved at creation time via utils/countyLookup. */
  county?: string | null;
  signCount: number;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Input shape for creating/editing a distribution point */
export interface DistributionPointInput {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  signCount: number;
  notes?: string;
}

// Location reports (missing + incorrect)
export type LocationReportCategory = 'missing' | 'incorrect';
export type LocationReportStatus = 'pending' | 'resolved';

export interface LocationReport {
  id: string;
  campaignId: string;
  category: LocationReportCategory;
  locationName: string;
  address: string;
  latitude: number;
  longitude: number;
  /** Texas county the point falls in, resolved at creation time via utils/countyLookup. */
  county?: string | null;
  existingLocationId: string | null;
  reporterName: string;
  reporterContact: string;
  notes: string;
  status: LocationReportStatus;
  createdAt: Timestamp;
  resolvedAt: Timestamp | null;
  resolvedNote: string | null;
}

export interface LocationReportInput {
  category: LocationReportCategory;
  locationName: string;
  address: string;
  latitude: number;
  longitude: number;
  existingLocationId: string | null;
  reporterName: string;
  reporterContact: string;
  notes: string;
}

// Planned sign locations (admin-managed)
export type PlannedSignStatus = 'planned' | 'placed';

export interface PlannedSignLocation {
  id: string;
  campaignId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  /** Texas county the point falls in, resolved at creation time via utils/countyLookup. */
  county?: string | null;
  notes?: string;
  status: PlannedSignStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PlannedSignLocationInput {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  notes?: string;
  status?: PlannedSignStatus;
}

// Sign pickup tracking (admin checks off volunteers who collected signs).
// Doc ID is composite: `${campaignId}__${normalizedEmail}` so the same
// volunteer can have separate pickup records per campaign.
export interface SignPickup {
  id: string;
  campaignId: string;
  volunteerEmail: string;
  signCount: number;
  pickedUpAt: Timestamp;
  updatedAt: Timestamp;
}

// Sign submission types (from big_sign_mapper)
export type PostingMethod = 'fence' | 'tPost' | 'other';

export interface SignSubmission {
  id: string;
  campaignId: string;
  volunteerName: string;
  volunteerPhone: string;
  volunteerEmail: string;
  photoUrl: string;
  photoPath: string;
  notes: string;
  latitude: number;
  longitude: number;
  /** Texas county the point falls in, resolved at creation time via utils/countyLookup. */
  county?: string | null;
  address: string;
  postingMethod: PostingMethod;
  signCount: number;
  isRetrieved: boolean;
  retrievedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SignSubmissionInput {
  volunteerName: string;
  volunteerPhone: string;
  volunteerEmail: string;
  photo: File;
  notes: string;
  latitude: number;
  longitude: number;
  address: string;
  postingMethod: PostingMethod;
  signCount: number;
}

export interface GeocodingResult {
  displayName: string;
  lat: number;
  lon: number;
}

/**
 * Regional coordinator login. Doc ID is sha256(`${campaignId}:${code}`) where
 * `code` is a random string generated by the statewide admin, so possessing
 * the code is what grants access and listing doc IDs reveals nothing useful.
 */
export interface Coordinator {
  id: string;
  campaignId: string;
  name: string;
  email: string;
  counties: string[];
  createdAt: Timestamp | null;
}

/** Resolved admin session: statewide admin (all counties) or a regional coordinator. */
export type AdminRole = 'state' | 'regional';
