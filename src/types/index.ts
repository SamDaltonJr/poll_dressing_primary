import { Timestamp } from 'firebase/firestore';

export interface SignSubmission {
  id: string;
  volunteerName: string;
  photoUrl: string;
  photoPath: string;
  notes: string;
  latitude: number;
  longitude: number;
  address: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SignSubmissionInput {
  volunteerName: string;
  photo: File;
  notes: string;
  latitude: number;
  longitude: number;
  address: string;
}

export interface GeocodingResult {
  displayName: string;
  lat: number;
  lon: number;
}
