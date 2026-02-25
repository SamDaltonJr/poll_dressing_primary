import type { GeocodingResult } from '../types';
import { DFW_VIEWBOX } from '../config/constants';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export async function forwardGeocode(query: string): Promise<GeocodingResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    limit: '5',
    countrycodes: 'us',
    viewbox: DFW_VIEWBOX,
    bounded: '0',
  });

  const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
    headers: { 'User-Agent': 'BigSignMapper/1.0' },
  });

  const data = await res.json();
  return data.map((item: any) => ({
    displayName: item.display_name,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
  }));
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    format: 'json',
  });

  const res = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
    headers: { 'User-Agent': 'BigSignMapper/1.0' },
  });

  const data = await res.json();
  return data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}
