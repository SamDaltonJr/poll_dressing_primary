import { useEffect, useMemo, useRef } from 'react';
import { Marker, useMap, useMapEvents } from 'react-leaflet';
import { createMovePinIcon } from '../../config/constants';

interface MovePinHandlerProps {
  position: [number, number];
  onMove: (lat: number, lng: number) => void;
}

/** Street level, close enough to tell buildings (and entrances) apart. */
const MOVE_ZOOM = 18;

/**
 * The pin an admin is repositioning: draggable, and a tap on the map moves it
 * there too (easier than dragging on a phone). Zooms in once on start.
 */
export default function MovePinHandler({ position, onMove }: MovePinHandlerProps) {
  const map = useMap();
  const icon = useMemo(() => createMovePinIcon(), []);
  const zoomed = useRef(false);

  useEffect(() => {
    if (zoomed.current) return;
    zoomed.current = true;
    map.closePopup();
    map.setView(position, Math.max(map.getZoom(), MOVE_ZOOM), { animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng);
    },
  });

  return (
    <Marker
      position={position}
      icon={icon}
      draggable
      autoPan
      zIndexOffset={2000}
      eventHandlers={{
        dragend(e) {
          const latlng = e.target.getLatLng();
          onMove(latlng.lat, latlng.lng);
        },
      }}
    />
  );
}
