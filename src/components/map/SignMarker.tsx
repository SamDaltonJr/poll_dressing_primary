import { Marker, Popup } from 'react-leaflet';
import { createSignMarkerIcon } from '../../config/constants';
import type { SignSubmission } from '../../types';

const METHOD_LABELS: Record<string, string> = {
  fence: 'Fence',
  tPost: 'T-Post',
  other: 'Other',
};

const signIcon = createSignMarkerIcon();

interface SignMarkerProps {
  submission: SignSubmission;
}

export default function SignMarker({ submission }: SignMarkerProps) {
  return (
    <Marker position={[submission.latitude, submission.longitude]} icon={signIcon}>
      <Popup maxWidth={280}>
        <div className="marker-popup">
          <div className="marker-popup-info">
            {submission.photoUrl && (
              <img
                src={submission.photoUrl}
                alt="Sign photo"
                className="marker-popup-photo"
              />
            )}
            <strong>{submission.volunteerName}</strong>
            <p className="marker-popup-address">{submission.address}</p>
            <p className="marker-popup-signs">
              {submission.signCount || 1} sign{(submission.signCount || 1) !== 1 ? 's' : ''} &middot; {METHOD_LABELS[submission.postingMethod] || submission.postingMethod || '—'}
            </p>
            {submission.notes && (
              <p className="marker-popup-notes">{submission.notes}</p>
            )}
            <p className="marker-popup-date">
              {submission.createdAt?.toDate?.()?.toLocaleDateString() || ''}
            </p>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
