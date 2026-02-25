import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import MapClickHandler from '../map/MapClickHandler';
import GpsButton from './GpsButton';
import AddressSearch from './AddressSearch';
import { reverseGeocode } from '../../services/geocodeService';
import { MAP_CENTER, MAP_ZOOM, TILE_URL, TILE_ATTRIBUTION } from '../../config/constants';
import type { GeocodingResult } from '../../types';

type LocationMode = 'gps' | 'address' | 'pin';

interface LocationPickerProps {
  onLocationSet: (lat: number, lng: number, address: string) => void;
  selectedLat: number | null;
  selectedLng: number | null;
  selectedAddress: string;
}

export default function LocationPicker({
  onLocationSet,
  selectedLat,
  selectedLng,
  selectedAddress,
}: LocationPickerProps) {
  const isMobile = 'geolocation' in navigator && /Mobi|Android/i.test(navigator.userAgent);
  const [mode, setMode] = useState<LocationMode>(isMobile ? 'gps' : 'address');

  const handleGps = useCallback(async (lat: number, lng: number) => {
    const address = await reverseGeocode(lat, lng);
    onLocationSet(lat, lng, address);
  }, [onLocationSet]);

  const handleAddressSelect = useCallback((result: GeocodingResult) => {
    onLocationSet(result.lat, result.lon, result.displayName);
  }, [onLocationSet]);

  const handlePinDrop = useCallback(async (lat: number, lng: number) => {
    const address = await reverseGeocode(lat, lng);
    onLocationSet(lat, lng, address);
  }, [onLocationSet]);

  return (
    <div className="location-picker">
      <div className="location-tabs">
        <button
          type="button"
          className={`tab ${mode === 'gps' ? 'active' : ''}`}
          onClick={() => setMode('gps')}
        >
          GPS
        </button>
        <button
          type="button"
          className={`tab ${mode === 'address' ? 'active' : ''}`}
          onClick={() => setMode('address')}
        >
          Address
        </button>
        <button
          type="button"
          className={`tab ${mode === 'pin' ? 'active' : ''}`}
          onClick={() => setMode('pin')}
        >
          Pin Drop
        </button>
      </div>

      <div className="location-mode-content">
        {mode === 'gps' && <GpsButton onLocation={handleGps} />}
        {mode === 'address' && <AddressSearch onSelect={handleAddressSelect} />}
        {mode === 'pin' && (
          <div className="pin-drop-map">
            <p className="search-hint">Click on the map to set the sign location.</p>
            <MapContainer
              center={selectedLat && selectedLng ? [selectedLat, selectedLng] : MAP_CENTER}
              zoom={MAP_ZOOM + 2}
              className="mini-map"
            >
              <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
              <MapClickHandler onClick={handlePinDrop} />
              {selectedLat && selectedLng && (
                <Marker position={[selectedLat, selectedLng]} />
              )}
            </MapContainer>
          </div>
        )}
      </div>

      {selectedAddress && (
        <div className="selected-location">
          <strong>Selected:</strong> {selectedAddress}
        </div>
      )}
    </div>
  );
}
