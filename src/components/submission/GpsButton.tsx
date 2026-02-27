import { useGeolocation } from '../../hooks/useGeolocation';
import { useEffect } from 'react';

interface GpsButtonProps {
  onLocation: (lat: number, lng: number) => void;
}

export default function GpsButton({ onLocation }: GpsButtonProps) {
  const { latitude, longitude, loading, error, getPosition } = useGeolocation();

  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      onLocation(latitude, longitude);
    }
  }, [latitude, longitude, onLocation]);

  return (
    <div className="gps-button-wrapper">
      <button
        type="button"
        className="btn btn-primary"
        onClick={getPosition}
        disabled={loading}
      >
        {loading ? 'Getting location...' : 'Use My Current Location'}
      </button>
      {error && <p className="error-text">{error}</p>}
      {latitude !== null && longitude !== null && (
        <p className="success-text">
          Location found: {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </p>
      )}
    </div>
  );
}
