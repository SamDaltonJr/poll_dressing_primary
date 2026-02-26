import { Timestamp } from 'firebase/firestore';

// Marker type system — categorized types used in the app
export type MarkerType = 'dualSite' | 'earlyVotingOnly' | 'electionDayOnly';

// Raw types from source data files (before categorization)
export type RawMarkerType = 'earlyVoting' | 'electionDay';

export type LocationSize = 'S' | 'M' | 'L';

export interface MarkerTypeConfig {
  label: string;
  color: string;
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
  isDressed: boolean;
  volunteerName: string;
  volunteerPhone: string;
  volunteerEmail: string;
  dressedAt: Timestamp;
  dressedBy: 'volunteer' | 'admin';
  revertedAt: Timestamp | null;
  revertedBy: string | null;
  updatedAt: Timestamp;
}

export interface DressingInput {
  volunteerName: string;
  volunteerPhone: string;
  volunteerEmail: string;
}
