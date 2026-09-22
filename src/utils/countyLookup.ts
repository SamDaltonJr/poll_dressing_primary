/**
 * Point → Texas county lookup against simplified Census county boundaries.
 *
 * Boundaries live in public/tx-counties.json (~250 KB, ~80 KB gzipped) and are
 * fetched once on first use, so pages that never need a lookup don't pay for
 * them. Used to stamp a county onto sign submissions, planned signs, etc. at
 * creation time (regional coordinators are scoped by county), and as a
 * fallback for older records that were saved without one.
 */

type Ring = number[][];
type Polygon = Ring[];

interface CountyShape {
  name: string;
  bbox: [number, number, number, number];
  polygons: Polygon[];
}

let shapes: CountyShape[] | null = null;
let loading: Promise<CountyShape[]> | null = null;

function computeBBox(polygons: Polygon[]): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const poly of polygons) {
    for (const [x, y] of poly[0]) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return [minX, minY, maxX, maxY];
}

function pointInRing(x: number, y: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(x: number, y: number, polygon: Polygon): boolean {
  if (!pointInRing(x, y, polygon[0])) return false;
  for (let i = 1; i < polygon.length; i++) {
    if (pointInRing(x, y, polygon[i])) return false;
  }
  return true;
}

/** Fetch and index county boundaries. Safe to call repeatedly. */
export function loadCountyShapes(): Promise<CountyShape[]> {
  if (shapes) return Promise.resolve(shapes);
  if (!loading) {
    loading = fetch(`${import.meta.env.BASE_URL}tx-counties.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`County boundaries: HTTP ${res.status}`);
        return res.json();
      })
      .then((geo: { features: Array<{ properties: { name: string }; geometry: { type: string; coordinates: unknown } }> }) => {
        shapes = geo.features.map((f) => {
          const polygons = (f.geometry.type === 'MultiPolygon'
            ? f.geometry.coordinates
            : [f.geometry.coordinates]) as Polygon[];
          return { name: f.properties.name, polygons, bbox: computeBBox(polygons) };
        });
        return shapes;
      })
      .catch((err) => {
        // Allow a retry on the next call rather than caching the failure.
        loading = null;
        throw err;
      });
  }
  return loading;
}

/** County containing the point, or null if outside Texas / shapes not loaded. */
export function lookupCountySync(lat: number, lng: number): string | null {
  if (!shapes) return null;
  for (const s of shapes) {
    const [minX, minY, maxX, maxY] = s.bbox;
    if (lng < minX || lng > maxX || lat < minY || lat > maxY) continue;
    for (const poly of s.polygons) {
      if (pointInPolygon(lng, lat, poly)) return s.name;
    }
  }
  return null;
}

/** County containing the point. Resolves null (never rejects) on any failure. */
export async function lookupCounty(lat: number, lng: number): Promise<string | null> {
  try {
    await loadCountyShapes();
    return lookupCountySync(lat, lng);
  } catch (err) {
    console.error('County lookup failed:', err);
    return null;
  }
}
