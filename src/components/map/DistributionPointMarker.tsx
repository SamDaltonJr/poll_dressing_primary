import { Marker, Popup } from 'react-leaflet';
import { createDistributionPointIcon } from '../../config/constants';
import type { DistributionPoint } from '../../types';

interface DistributionPointMarkerProps {
  point: DistributionPoint;
}

export default function DistributionPointMarker({ point }: DistributionPointMarkerProps) {
  const icon = createDistributionPointIcon();

  return (
    <Marker position={[point.latitude, point.longitude]} icon={icon}>
      <Popup maxWidth={280}>
        <div className="marker-popup">
          <div className="marker-popup-info">
            <strong>{point.name}</strong>
            <p className="marker-popup-address">{point.address}</p>
            <span className="marker-popup-type">Sign Distribution</span>
            <div className="distribution-sign-count">
              <span className="sign-count-number">{point.signCount}</span>
              <span className="sign-count-label">signs available</span>
            </div>
            {point.notes && (
              <p className="marker-popup-notes">{point.notes}</p>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
