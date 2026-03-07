import { useState, useEffect, useRef } from 'react';
import { Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';

const USER_DOT_ICON = L.divIcon({
  className: 'user-location-icon',
  html: `<div class="user-location-dot"><div class="user-location-pulse"></div></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export default function UserLocationMarker() {
  const map = useMap();
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number>(0);
  const hasCentered = useRef(false);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const latlng: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPosition(latlng);
        setAccuracy(pos.coords.accuracy);

        // Fly to user location on first fix only
        if (!hasCentered.current) {
          hasCentered.current = true;
          map.flyTo(latlng, 13, { duration: 1 });
        }
      },
      () => {
        // Silently ignore — user may have denied permission
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [map]);

  if (!position) return null;

  return (
    <>
      {accuracy > 20 && (
        <Circle
          center={position}
          radius={accuracy}
          pathOptions={{ color: '#4285f4', fillColor: '#4285f4', fillOpacity: 0.1, weight: 1 }}
        />
      )}
      <Marker position={position} icon={USER_DOT_ICON} interactive={false} />
    </>
  );
}
