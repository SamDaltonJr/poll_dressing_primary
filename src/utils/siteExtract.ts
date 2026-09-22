/**
 * Pull polling sites (name + address) out of unstructured text: text extracted
 * from a county's PDF, or copied from a county web page.
 *
 * County lists vary wildly — tables, one site per paragraph, name and address
 * on one line or three — so this anchors on the one thing they all share: a
 * street address. For each address it takes the site name from the same line
 * (text to the left of it) or the nearest meaningful line above it, and picks
 * up "City, TX 75xxx" from the following line when the address line lacks it.
 *
 * It's a first pass, not gospel: the admin reviews and edits every row before
 * anything is geocoded or saved.
 */

export interface ExtractedSite {
  name: string;
  address: string;
}

/** Cell separator used when a line has a wide horizontal gap (table columns). */
export const CELL_SEP = ' | ';

const STREET_SUFFIX =
  'St|Street|Ave|Avenue|Av|Rd|Road|Dr|Drive|Blvd|Boulevard|Pkwy|Parkway|Hwy|Highway|Ln|Lane|Ct|Court|Way|Pl|Place|' +
  'Cir|Circle|Trl|Trail|Fwy|Freeway|Expy|Expressway|Loop|Plaza|Plz|Sq|Square|Ter|Terrace|Pike|Crossing|Xing|' +
  'Run|Path|Pass|Bend|Cv|Cove|Grv|Grove|Hls|Hills|Pt|Point|Walk|Tpke|Turnpike|Spur';

// "1234 N Main St", "901 W. Wheatland Rd.", "200 E Border Street Ste 5"
const STREET_RE = new RegExp(
  String.raw`\b\d{1,6}(?:-\d+)?[A-Z]?\s+(?:[NSEW]\.?\s+|North\s+|South\s+|East\s+|West\s+)?` +
  String.raw`(?:[A-Za-z0-9.'&-]+\s+){0,5}?(?:${STREET_SUFFIX})\b\.?(?:\s+[NSEW]\b\.?)?`,
  'i',
);

// "12345 FM 1960", "300 State Hwy 71 W", "5 County Road 402", "8000 IH-35 N", "400 US-290"
const HIGHWAY_RE =
  /\b\d{1,6}[A-Z]?\s+(?:[NSEW]\.?\s+)?(?:FM|RM|RR|SH|US|IH|I|CR|Farm to Market(?: Road)?|Ranch Road|State Hwy|State Highway|Highway|Hwy|County Road|Interstate|Loop|Spur|Business)\s*-?\s*\d{1,4}[A-Z]?\b(?:\s+[NSEW]\b\.?)?/i;

const UNIT_RE = /^[,\s]*(?:(?:Suite|Ste|Room|Rm|Bldg|Building|Unit|#)\.?\s*[\w-]+)/i;

// "Dallas, TX 75219", "DALLAS TX 75219-1234", "Dallas, Texas 75219", "Dallas 75219"
const CITY_ZIP_RE = /^[,\s]*([A-Za-z][A-Za-z .'-]{1,40}?)[,\s]+(?:(?:TX|Texas)\.?\s*)?(\d{5})(?:-\d{4})?\b/i;
const CITY_TX_RE = /^[,\s]*([A-Za-z][A-Za-z .'-]{1,40}?),?\s+(?:TX|Texas)\b\.?/i;

/** Lines that are never a site name: hours, dates, headers, page furniture. */
const NOISE_RE = new RegExp(
  [
    String.raw`^\d{1,2}(:\d{2})?\s*(a\.?m\.?|p\.?m\.?)`,
    String.raw`\b\d{1,2}(:\d{2})?\s*(a\.?m\.?|p\.?m\.?)\s*[-–to]+\s*\d`,
    // Whole day/month words only — "Friendship West" and "Marshall" are names.
    String.raw`^(mon|tues?|wed|thu|thurs|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b`,
    String.raw`^(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\.?\s+\d`,
    String.raw`^\d{1,2}/\d{1,2}(/\d{2,4})?`,
    String.raw`^page\s+\d`,
    String.raw`^(polling|voting)\s+(place|location|site)s?$`,
    String.raw`^(location|site|address|name|hours|city|zip|precinct|room)s?\b[\s|]*(name|address|hours)?$`,
    String.raw`^early voting\b`,
    String.raw`^election day\b`,
    String.raw`^vote centers?\b`,
    String.raw`^[\d\s|,.-]*$`,
  ].join('|'),
  'i',
);

function findStreet(text: string): { index: number; match: string } | null {
  const a = STREET_RE.exec(text);
  const b = HIGHWAY_RE.exec(text);
  const hit = a && b ? (a.index <= b.index ? a : b) : a ?? b;
  return hit ? { index: hit.index, match: hit[0] } : null;
}

function clean(s: string): string {
  return s.replace(/\s*\|\s*/g, ' ').replace(/\s+/g, ' ').replace(/^[\s,;:–-]+|[\s,;:–-]+$/g, '').trim();
}

function isNoise(line: string): boolean {
  const t = clean(line);
  return t.length < 3 || NOISE_RE.test(t);
}

/**
 * Consume trailing unit + city/zip text after a street match. Returns the
 * address tail ("Suite 100, Dallas, TX 75232") and whether a city was found.
 */
function takeTail(rest: string): { tail: string; hasCity: boolean } {
  let tail = '';
  let cellBreak = /^\s*\|/.test(rest);
  let r = rest.replace(/^\s*\|\s*/, ' ');
  const unit = UNIT_RE.exec(r);
  if (unit) {
    tail += `, ${clean(unit[0])}`;
    r = r.slice(unit[0].length);
    cellBreak = /^\s*\|/.test(r);
  }
  r = r.replace(/^\s*\|\s*/, ' ');
  const cz = CITY_ZIP_RE.exec(r) ?? CITY_TX_RE.exec(r);
  if (cz) {
    const zip = cz[2] ? ` ${cz[2]}` : '';
    tail += `, ${clean(cz[1])}, TX${zip}`;
    return { tail, hasCity: true };
  }
  // Table layout: a bare city in its own column ("… | Dallas | 7:00 AM").
  if (cellBreak) {
    const cells = r.split('|').map((c) => c.trim());
    const city = cells[0];
    const zip = cells[1] && /^\d{5}(-\d{4})?$/.test(cells[1]) ? ` ${cells[1].slice(0, 5)}` : '';
    if (/^[A-Za-z][A-Za-z .'-]{1,30}$/.test(city) && city.split(' ').length <= 3 && !isNoise(city)) {
      tail += `, ${city}, TX${zip}`;
      return { tail, hasCity: true };
    }
  }
  return { tail, hasCity: false };
}

export function extractSites(lines: string[]): ExtractedSite[] {
  const sites: ExtractedSite[] = [];
  const seen = new Set<string>();
  // Lines already used as part of an address, so they can't become a name.
  const consumed = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const street = findStreet(line);
    if (!street) continue;

    const before = line.slice(0, street.index);
    const after = line.slice(street.index + street.match.length);
    let { tail, hasCity } = takeTail(after);

    // City/ZIP on the next line (common in "name / address / city" blocks).
    if (!hasCity && i + 1 < lines.length && !findStreet(lines[i + 1])) {
      const next = takeTail(lines[i + 1]);
      if (next.hasCity) {
        tail += next.tail;
        hasCity = true;
        consumed.add(i + 1);
      }
    }

    // Name: text left of the address on this line, else the nearest
    // meaningful line above (up to 3 back) that isn't itself an address.
    let name = clean(before);
    if (name.length < 3 || isNoise(name)) {
      name = '';
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        if (consumed.has(j) || findStreet(lines[j])) break;
        if (isNoise(lines[j])) continue;
        // In a table row the name is usually the first cell.
        name = clean(lines[j].split(CELL_SEP)[0]);
        break;
      }
    }
    consumed.add(i);

    const address = clean(`${street.match}${tail}`);
    const key = `${name.toLowerCase()}|${address.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sites.push({ name, address });
  }
  return sites;
}

/** Split pasted text into lines, treating tabs (from copied HTML tables) as cell breaks. */
export function linesFromText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/\t+/g, CELL_SEP).trim())
    .filter(Boolean);
}
