import { MapContainer, TileLayer } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import SignMarker from './SignMarker';
import { MAP_CENTER, MAP_ZOOM, TILE_URL, TILE_ATTRIBUTION } from '../../config/constants';
import type { SignSubmission } from '../../types';

interface MapViewProps {
  submissions: SignSubmission[];
}

export default function MapView({ submissions }: MapViewProps) {
  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={MAP_ZOOM}
      className="map-container"
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <MarkerClusterGroup chunkedLoading>
        {submissions.map((sub) => (
          <SignMarker key={sub.id} submission={sub} />
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
