/**
 * One CSV → site lists for many counties. Rows are grouped by a County
 * column and each group then goes through the normal single-county import
 * (toImportRows → planImport → applyImport), so matching, geocoding and the
 * "replaces this county's list" rule work exactly as they do one at a time.
 */

import { findCounty } from '../config/texasCounties';
import { toImportRows, type ColumnMap, type ImportRow, type ParsedCsv } from './locationImport';

const COUNTY_HEADER_ALIASES = ['county', 'county name', 'jurisdiction'];

/** The CSV header that holds the county, if there's an obvious one. */
export function guessCountyColumn(headers: string[]): string | undefined {
  const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return headers.find((h) => COUNTY_HEADER_ALIASES.includes(norm(h)))
    ?? headers.find((h) => norm(h).includes('county'));
}

export interface CountyGroup {
  /** Canonical county name from TEXAS_COUNTIES. */
  county: string;
  rows: ImportRow[];
}

export interface CountySplit {
  groups: CountyGroup[];
  /** Spreadsheet row numbers missing a name or address. */
  skipped: number[];
  /** County values that aren't Texas counties, with the rows that used them. */
  unknown: Array<{ value: string; rowNumbers: number[] }>;
}

export function splitByCounty(parsed: ParsedCsv, columns: ColumnMap, countyColumn: string): CountySplit {
  const { rows, skipped } = toImportRows(parsed, columns);
  const byCounty = new Map<string, ImportRow[]>();
  const unknown = new Map<string, number[]>();
  for (const row of rows) {
    // rowNumber is the spreadsheet row: header is row 1, data starts at 2.
    const raw = (parsed.rows[row.rowNumber - 2]?.[countyColumn] ?? '').trim();
    const info = findCounty(raw);
    if (!info) {
      const key = raw || '(blank)';
      unknown.set(key, [...(unknown.get(key) ?? []), row.rowNumber]);
      continue;
    }
    byCounty.set(info.name, [...(byCounty.get(info.name) ?? []), row]);
  }
  return {
    groups: [...byCounty.entries()]
      .map(([county, r]) => ({ county, rows: r }))
      .sort((a, b) => a.county.localeCompare(b.county)),
    skipped,
    unknown: [...unknown.entries()].map(([value, rowNumbers]) => ({ value, rowNumbers })),
  };
}
