import { useMemo } from 'react';
import { useMapEvents, Marker } from 'react-leaflet';
import { createPinDropIcon } from '../../config/constants';

interface PinDropHandlerProps {
  active: boolean;
  pinPosition: [number, number] | null;
  onPinPlaced: (lat: number, lng: number) => void;
}

export default function PinDropHandler({ active, pinPosition, onPinPlaced }: PinDropHandlerProps) {
  const icon = useMemo(() => createPinDropIcon(), []);

  useMapEvents({
    click(e) {
      if (active) {
        onPinPlaced(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  if (!pinPosition) return null;

  return (
    <Marker
      position={pinPosition}
      icon={icon}
      draggable
      eventHandlers={{
        dragend(e) {
          const latlng = e.target.getLatLng();
          onPinPlaced(latlng.lat, latlng.lng);
        },
      }}
    />
  );
}
