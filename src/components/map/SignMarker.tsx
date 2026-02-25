import { Marker, Popup } from 'react-leaflet';
import { createMarkerIcon } from '../../config/constants';
import type { MapMarker } from '../../types';

interface SignMarkerProps {
  marker: MapMarker;
}

const SIZE_LABELS = { S: 'Small', M: 'Medium', L: 'Large' } as const;

export default function SignMarker({ marker }: SignMarkerProps) {
  const icon = createMarkerIcon(marker.type, marker.size);

  return (
    <Marker position={[marker.latitude, marker.longitude]} icon={icon}>
      <Popup maxWidth={280}>
        <div className="marker-popup">
          {marker.photoUrl && (
            <img
              src={marker.photoUrl}
              alt="Sign placement"
              className="marker-popup-photo"
            />
          )}
          <div className="marker-popup-info">
            <strong>{marker.label}</strong>
            <p className="marker-popup-address">{marker.address}</p>
            {marker.size && (
              <p className="marker-popup-size">Size: {SIZE_LABELS[marker.size]}</p>
            )}
            {marker.notes && <p className="marker-popup-notes">{marker.notes}</p>}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
