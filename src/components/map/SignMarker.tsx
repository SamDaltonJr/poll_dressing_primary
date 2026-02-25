import { Marker, Popup } from 'react-leaflet';
import type { SignSubmission } from '../../types';

interface SignMarkerProps {
  submission: SignSubmission;
}

export default function SignMarker({ submission }: SignMarkerProps) {
  return (
    <Marker position={[submission.latitude, submission.longitude]}>
      <Popup maxWidth={280}>
        <div className="marker-popup">
          {submission.photoUrl && (
            <img
              src={submission.photoUrl}
              alt="Sign placement"
              className="marker-popup-photo"
            />
          )}
          <div className="marker-popup-info">
            <strong>{submission.volunteerName}</strong>
            <p className="marker-popup-address">{submission.address}</p>
            {submission.notes && <p className="marker-popup-notes">{submission.notes}</p>}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
