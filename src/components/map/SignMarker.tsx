import { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { createSignMarkerIcon } from '../../config/constants';
import type { SignSubmission } from '../../types';

const METHOD_LABELS: Record<string, string> = {
  fence: 'Fence',
  tPost: 'T-Post',
  other: 'Other',
};

interface SignMarkerProps {
  submission: SignSubmission;
  onRetrieveClick?: (submission: SignSubmission) => void;
  hasAccess?: boolean;
}

export default function SignMarker({ submission, onRetrieveClick, hasAccess }: SignMarkerProps) {
  const icon = useMemo(() => createSignMarkerIcon(!!submission.isRetrieved), [submission.isRetrieved]);

  return (
    <Marker position={[submission.latitude, submission.longitude]} icon={icon}>
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
            {submission.isRetrieved ? (
              <div className="dressing-status retrieved" style={{ marginTop: 6 }}>
                RETRIEVED
                {submission.retrievedAt?.toDate && (
                  <> on {submission.retrievedAt.toDate().toLocaleDateString()}</>
                )}
              </div>
            ) : onRetrieveClick && (
              <button
                className="btn btn-primary btn-sm marker-popup-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onRetrieveClick(submission);
                }}
              >
                {hasAccess ? 'Sign Retrieved' : 'Enter Code to Mark Retrieved'}
              </button>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
