// Bake congressional district + county into every polling location.
//
// Inputs:
//   data/tx-counties.geojson      — Census TIGERweb counties (state=48), WGS84.
//   data/tx-cd-planc2333.geojson  — PLANC2333 (Texas 2025 mid-decade redistricting),
//                                   reprojected to WGS84 via mapshaper.
//   src/config/pollingLocations.ts        \  parsed by regex; relies on the existing
//   src/config/electionDayLocations.ts    /  uniform { id, latitude, longitude } shape.
//
// Output:
//   src/config/locationGeo.json   — { [id]: { county, congressionalDistrict } }
//
// Re-running is idempotent. Counties are stable, but if Texas redistricts again
// (or the next census redistrict in 2031), regenerate the CD geojson and rerun.
//
// Usage: node scripts/bake-geo.mjs

import fs from 'node:fs';

const COUNTIES_PATH = 'data/tx-counties.geojson';
const CDS_PATH = 'data/tx-cd-planc2333.geojson';
const LOCATIONS_FILES = [
  'src/config/pollingLocations.ts',
  'src/config/electionDayLocations.ts',
];
const OUTPUT_PATH = 'src/config/locationGeo.json';

// --- Point-in-polygon (ray-casting) ---------------------------------------

function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      (yi > y) !== (yj > y) &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point, polygon) {
  // polygon = [outerRing, hole1, hole2, ...]
  if (!pointInRing(point, polygon[0])) return false;
  for (let i = 1; i < polygon.length; i++) {
    if (pointInRing(point, polygon[i])) return false;
  }
  return true;
}

function pointInFeature(point, feature) {
  const g = feature.geometry;
  if (!g) return false;
  if (g.type === 'Polygon') return pointInPolygon(point, g.coordinates);
  if (g.type === 'MultiPolygon') {
    for (const p of g.coordinates) {
      if (pointInPolygon(point, p)) return true;
    }
    return false;
  }
  return false;
}

// Pre-compute a bounding box for each feature to skip impossible polygons fast.
function computeBBox(geom) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  function walk(coords) {
    if (typeof coords[0] === 'number') {
      const [x, y] = coords;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    } else {
      for (const c of coords) walk(c);
    }
  }
  walk(geom.coordinates);
  return [minX, minY, maxX, maxY];
}

function inBBox([x, y], [minX, minY, maxX, maxY]) {
  return x >= minX && x <= maxX && y >= minY && y <= maxY;
}

// --- Location extraction --------------------------------------------------

// Match the well-formed object pattern in pollingLocations.ts / electionDayLocations.ts.
// Each entry has id, latitude, longitude in known order. If that ever changes,
// this regex needs to evolve with it.
const LOCATION_RE =
  /\{\s*id:\s*'([^']+)',[\s\S]*?latitude:\s*(-?\d+\.?\d*),\s*longitude:\s*(-?\d+\.?\d*),/g;

function extractLocations(content) {
  const out = [];
  for (const m of content.matchAll(LOCATION_RE)) {
    out.push({
      id: m[1],
      lat: parseFloat(m[2]),
      lon: parseFloat(m[3]),
    });
  }
  return out;
}

// --- Main -----------------------------------------------------------------

function loadGeoJson(path) {
  if (!fs.existsSync(path)) {
    throw new Error(`Missing ${path} — see comments at top of this script.`);
  }
  const json = JSON.parse(fs.readFileSync(path, 'utf8'));
  for (const f of json.features) {
    f._bbox = computeBBox(f.geometry);
  }
  return json;
}

function findFeature(point, geojson) {
  for (const f of geojson.features) {
    if (!inBBox(point, f._bbox)) continue;
    if (pointInFeature(point, f)) return f;
  }
  return null;
}

function countyName(feature) {
  // TIGERweb returns "Dallas County"; strip the trailing word for cleaner display.
  return feature.properties.NAME.replace(/\s+County$/i, '');
}

function cdLabel(feature) {
  // PLANC2333 features carry only a numeric District field.
  return `TX-${feature.properties.District}`;
}

const counties = loadGeoJson(COUNTIES_PATH);
const cds = loadGeoJson(CDS_PATH);

const locations = LOCATIONS_FILES.flatMap((p) =>
  extractLocations(fs.readFileSync(p, 'utf8')),
);

console.log(`Baking geo for ${locations.length} locations across ${LOCATIONS_FILES.length} files...`);
const t0 = Date.now();

const out = {};
let unmappedCounty = 0;
let unmappedCd = 0;
const cdHistogram = new Map();
const countyHistogram = new Map();

for (const loc of locations) {
  const point = [loc.lon, loc.lat];

  const cf = findFeature(point, counties);
  const df = findFeature(point, cds);

  const county = cf ? countyName(cf) : null;
  const cd = df ? cdLabel(df) : null;

  if (!county) unmappedCounty++;
  if (!cd) unmappedCd++;

  if (county) countyHistogram.set(county, (countyHistogram.get(county) ?? 0) + 1);
  if (cd) cdHistogram.set(cd, (cdHistogram.get(cd) ?? 0) + 1);

  out[loc.id] = { county, congressionalDistrict: cd };
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(out));
const seconds = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`Wrote ${OUTPUT_PATH} (${Object.keys(out).length} entries) in ${seconds}s`);

const top = (m, n) =>
  [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k}=${v}`);

console.log(`Counties: ${countyHistogram.size} unique. Top 10: ${top(countyHistogram, 10).join(', ')}`);
console.log(`CDs: ${cdHistogram.size} unique. Top 10: ${top(cdHistogram, 10).join(', ')}`);
if (unmappedCounty) console.log(`  WARNING: ${unmappedCounty} locations had no matching county.`);
if (unmappedCd) console.log(`  WARNING: ${unmappedCd} locations had no matching CD.`);
