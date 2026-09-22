/**
 * Address → coordinates for admin CSV imports.
 *
 * Primary: US Census geocoder. It's free, handles US street addresses well and
 * has no hard rate limit, but it doesn't send CORS headers — so we call it
 * via JSONP (it supports `format=jsonp`). Fallback: Nominatim, which has CORS
 * but a 1 request/second usage policy, so fallbacks are serialized.
 */

export interface GeocodeHit {
  latitude: number;
  longitude: number;
  source: 'census' | 'nominatim';
  matchedAddress: string;
}

const CENSUS_URL = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const JSONP_TIMEOUT_MS = 15000;

let jsonpCounter = 0;

function jsonp<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const cbName = `__censusCb${Date.now()}_${jsonpCounter++}`;
    const script = document.createElement('script');
    const w = window as unknown as Record<string, unknown>;
    const cleanup = () => {
      clearTimeout(timer);
      delete w[cbName];
      script.remove();
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Geocoder timed out'));
    }, JSONP_TIMEOUT_MS);
    w[cbName] = (data: T) => {
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('Geocoder request failed'));
    };
    script.src = `${url}&callback=${cbName}`;
    document.head.appendChild(script);
  });
}

interface CensusResponse {
  result?: {
    addressMatches?: Array<{
      matchedAddress: string;
      coordinates: { x: number; y: number };
    }>;
  };
}

async function geocodeCensus(address: string): Promise<GeocodeHit | null> {
  const params = new URLSearchParams({
    address,
    benchmark: 'Public_AR_Current',
    format: 'jsonp',
  });
  const data = await jsonp<CensusResponse>(`${CENSUS_URL}?${params}`);
  const match = data.result?.addressMatches?.[0];
  if (!match) return null;
  return {
    latitude: match.coordinates.y,
    longitude: match.coordinates.x,
    source: 'census',
    matchedAddress: match.matchedAddress,
  };
}

// Serialize Nominatim calls to respect its 1 req/sec policy.
let nominatimChain: Promise<unknown> = Promise.resolve();

function geocodeNominatim(address: string): Promise<GeocodeHit | null> {
  const run = async (): Promise<GeocodeHit | null> => {
    const params = new URLSearchParams({
      q: address,
      format: 'json',
      limit: '1',
      countrycodes: 'us',
    });
    const res = await fetch(`${NOMINATIM_URL}?${params}`);
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    await new Promise((r) => setTimeout(r, 1100));
    if (!data[0]) return null;
    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
      source: 'nominatim',
      matchedAddress: data[0].display_name,
    };
  };
  const next = nominatimChain.then(run, run);
  nominatimChain = next.catch(() => undefined);
  return next;
}

/** Geocode one address. Resolves null if neither service finds it. */
export async function geocodeAddress(address: string): Promise<GeocodeHit | null> {
  try {
    const hit = await geocodeCensus(address);
    if (hit) return hit;
  } catch (err) {
    console.warn('Census geocode failed, falling back:', err);
  }
  try {
    return await geocodeNominatim(address);
  } catch (err) {
    console.warn('Nominatim geocode failed:', err);
    return null;
  }
}

/**
 * Geocode many addresses with bounded concurrency. `onProgress` fires after
 * each address completes. Results are index-aligned with the input.
 */
export async function geocodeMany(
  addresses: string[],
  onProgress?: (done: number, total: number) => void,
  concurrency = 5,
): Promise<Array<GeocodeHit | null>> {
  const results: Array<GeocodeHit | null> = new Array(addresses.length).fill(null);
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < addresses.length) {
      const i = next++;
      results[i] = await geocodeAddress(addresses[i]);
      done++;
      onProgress?.(done, addresses.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, addresses.length) }, worker));
  return results;
}
