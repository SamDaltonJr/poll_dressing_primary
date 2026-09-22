/**
 * Quick-pick county groups for assigning regional coordinators. These are
 * conveniences for the county picker only — coordinators are scoped by their
 * explicit county list, so edit freely. Names must match TEXAS_COUNTIES.
 */
export const TEXAS_REGIONS: Record<string, string[]> = {
  'DFW': ['Collin', 'Dallas', 'Denton', 'Ellis', 'Hood', 'Hunt', 'Johnson', 'Kaufman', 'Parker', 'Rockwall', 'Tarrant', 'Wise'],
  'Houston': ['Austin', 'Brazoria', 'Chambers', 'Fort Bend', 'Galveston', 'Harris', 'Liberty', 'Montgomery', 'Waller'],
  'Austin': ['Bastrop', 'Caldwell', 'Hays', 'Travis', 'Williamson'],
  'San Antonio': ['Atascosa', 'Bandera', 'Bexar', 'Comal', 'Guadalupe', 'Kendall', 'Medina', 'Wilson'],
  'Rio Grande Valley': ['Cameron', 'Hidalgo', 'Starr', 'Willacy'],
  'El Paso': ['El Paso', 'Hudspeth'],
  'Coastal Bend': ['Aransas', 'Kleberg', 'Nueces', 'San Patricio'],
  'Central Texas': ['Bell', 'Brazos', 'Coryell', 'McLennan'],
  'East Texas': ['Angelina', 'Gregg', 'Harrison', 'Nacogdoches', 'Smith'],
  'Golden Triangle': ['Hardin', 'Jefferson', 'Orange'],
  'Laredo': ['Webb', 'Zapata'],
  'West Texas': ['Ector', 'Lubbock', 'Midland', 'Potter', 'Randall', 'Taylor', 'Tom Green'],
};
