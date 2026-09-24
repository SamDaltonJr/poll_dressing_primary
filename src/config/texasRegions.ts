import { findCounty } from './texasCounties';

/**
 * Metro-area county groups. Used for the volunteer region picker on the map
 * and as quick-picks when assigning regional coordinators. Coordinators are
 * scoped by their explicit county list, so edit freely. Names must match
 * TEXAS_COUNTIES.
 */
export const TEXAS_REGIONS: Record<string, string[]> = {
  'DFW': ['Collin', 'Dallas', 'Denton', 'Ellis', 'Grayson', 'Hood', 'Hunt', 'Johnson', 'Kaufman', 'Navarro', 'Parker', 'Rockwall', 'Tarrant', 'Wise'],
  'Houston': ['Austin', 'Brazoria', 'Chambers', 'Fort Bend', 'Galveston', 'Harris', 'Liberty', 'Montgomery', 'Waller'],
  'Austin': ['Bastrop', 'Blanco', 'Burnet', 'Caldwell', 'Hays', 'Travis', 'Williamson'],
  'San Antonio': ['Atascosa', 'Bandera', 'Bexar', 'Comal', 'Gillespie', 'Guadalupe', 'Kendall', 'Kerr', 'Medina', 'Wilson'],
  'Rio Grande Valley': ['Cameron', 'Hidalgo', 'Starr', 'Willacy'],
  'El Paso': ['El Paso', 'Hudspeth'],
  'Coastal Bend': ['Aransas', 'Kleberg', 'Nueces', 'Refugio', 'San Patricio'],
  'Central Texas': ['Bell', 'Brazos', 'Coryell', 'Lampasas', 'McLennan'],
  'East Texas': ['Angelina', 'Bowie', 'Gregg', 'Harrison', 'Nacogdoches', 'Smith'],
  'Golden Triangle': ['Hardin', 'Jefferson', 'Orange'],
  'Laredo': ['Webb', 'Zapata'],
  'West Texas': ['Ector', 'Lubbock', 'Midland', 'Nolan', 'Potter', 'Randall', 'Taylor', 'Tom Green'],
};

export type Bbox = [number, number, number, number];

/** Whole state, [west, south, east, north]. */
export const TEXAS_BBOX: Bbox = [-106.65, 25.84, -93.51, 36.5];

/** Union of the county bounding boxes in a metro area, or null for an unknown region. */
export function regionBbox(region: string): Bbox | null {
  const counties = TEXAS_REGIONS[region];
  if (!counties) return null;
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const name of counties) {
    const info = findCounty(name);
    if (!info) continue;
    const [cw, cs, ce, cn] = info.bbox;
    w = Math.min(w, cw);
    s = Math.min(s, cs);
    e = Math.max(e, ce);
    n = Math.max(n, cn);
  }
  return Number.isFinite(w) ? [w, s, e, n] : null;
}
