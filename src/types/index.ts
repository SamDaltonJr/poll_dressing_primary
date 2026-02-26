import { Timestamp } from 'firebase/firestore';

// Marker type system — categorized types used in the app
export type MarkerType = 'dualSite' | 'earlyVotingOnly' | 'electionDayOnly';

// Location status for the claim → dressed flow
export type LocationStatus = 'available' | 'claimed' | 'dressed';

// Raw types from source data files (before categorization)
export type RawMarkerType = 'earlyVoting' | 'electionDay';

export type LocationSize = 'S' | 'M' | 'L';

export interface MarkerTypeConfig {
  label: string;
  color: string;
  claimedColor: string;
  dressedColor: string;
  defaultVisible: boolean;
}

/** Raw location entry from source data files (before categorization) */
export interface RawMapMarker {
  id: string;
  type: RawMarkerType;
  latitude: number;
  longitude: number;
  label: string;
  address: string;
  size?: LocationSize;
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
}

// Dressing records stored in Firestore (doc ID = location ID)
export interface DressingRecord {
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
  name: string;
  address: string;
  latitude: number;
  longitude: number;
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
  category: LocationReportCategory;
  locationName: string;
  address: string;
  latitude: number;
  longitude: number;
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
