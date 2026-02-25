import { Timestamp } from 'firebase/firestore';

export type PostingMethod = 'fence' | 'tPost' | 'other';

export interface SignSubmission {
  id: string;
  volunteerName: string;
  volunteerPhone: string;
  volunteerEmail: string;
  photoUrl: string;
  photoPath: string;
  notes: string;
  latitude: number;
  longitude: number;
  address: string;
  postingMethod: PostingMethod;
  signCount: number;
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

// Marker type system — extensible for future types
export type MarkerType = 'sign' | 'earlyVoting' | 'electionDay';

export type LocationSize = 'S' | 'M' | 'L';

export interface MarkerTypeConfig {
  label: string;
  color: string;
  defaultVisible: boolean;
}

export interface MapMarker {
  id: string;
  type: MarkerType;
  latitude: number;
  longitude: number;
  label: string;
  address: string;
  photoUrl?: string;
  notes?: string;
  size?: LocationSize;
}
