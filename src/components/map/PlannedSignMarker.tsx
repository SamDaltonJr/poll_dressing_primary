import { Marker, Popup } from 'react-leaflet';
import { createPlannedSignIcon } from '../../config/constants';
import type { PlannedSignLocation } from '../../types';

interface PlannedSignMarkerProps {
  sign: PlannedSignLocation;
}

export default function PlannedSignMarker({ sign }: PlannedSignMarkerProps) {
  const icon = createPlannedSignIcon(sign.status);

  return (
    <Marker position={[sign.latitude, sign.longitude]} icon={icon}>
      <Popup maxWidth={280}>
        <div className="marker-popup">
          <div className="marker-popup-info">
            <strong>{sign.name}</strong>
            <p className="marker-popup-address">{sign.address}</p>
            <span className="marker-popup-type">
              {sign.status === 'placed' ? 'Planned (Placed)' : 'Planned Location'}
            </span>
            {sign.notes && (
              <p className="marker-popup-notes">{sign.notes}</p>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
