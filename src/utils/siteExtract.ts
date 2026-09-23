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
 * Room details ("Room 104", "Fellowship Hall", "Bldg B") go into `notes`
 * rather than the name or address: a unit after the street, a room-like cell
 * in a table row, or a short room-like line right before or after the address.
 * When sites are separated by blank lines (an empty string in `lines`),
 * anything left in a site's block after its address is taken as notes.
 *
 * It's a first pass, not gospel: the admin reviews and edits every row before
 * anything is geocoded or saved.
 */

export interface ExtractedSite {
  name: string;
  address: string;
  /** Room / building / entrance, when the source gives one. */
  notes: string;
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

// \b after the keyword so "Ste" doesn't eat "Stephenville".
const UNIT_RE = /^[,\s]*(?:(?:Suite|Ste|Room|Rm|Bldg|Building|Unit)\b\.?\s*[\w-]+|#\s*[\w-]+)/i;

// "Oak Lawn Library, Room 104" → name + unit. Only numbered/lettered units:
// "Sleep Inn & Suites" and "Fire Station #6" are names.
const TRAILING_UNIT_RE = /[,\s]+((?:Suite|Ste|Room|Rm|Bldg|Building|Unit)\b\.?\s*(?:[A-Za-z]|[\w-]*\d[\w-]*))$/i;

// Words that mark text as "where inside the site" rather than the site itself...
const ROOM_WORD_RE =
  /\b(\w*room|rm|suite|ste|bldg|building|hall|gym|gymnasium|auditorium|cafeteria|annex|lobby|foyer|entrance|entry|doors?|wing|floor|chapel|sanctuary|portable|chambers?|clubhouse|conference|pavilion|atrium|commons)\b/i;
// ...unless it also names a kind of place ("Grace Church Fellowship Hall" is a site).
const PLACE_WORD_RE =
  /\b(library|church|school|elementary|middle|high|center|centre|college|university|courthouse|city hall|park|isd|academy|baptist|methodist|catholic|lutheran|presbyterian|temple|mosque|synagogue|county|city of)\b/i;

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

/** "Community Room", "Room 104", "Gym, enter east doors": short, room-ish, not a place name. */
function isRoomText(text: string): boolean {
  const t = clean(text);
  if (t.length < 3 || t.split(' ').length > 5 || isNoise(t) || findStreet(t)) return false;
  return (ROOM_WORD_RE.test(t) || /^#\s*\w/.test(t)) && !PLACE_WORD_RE.test(t);
}

/** Join note fragments, dropping blanks and ones already covered by another. */
function joinNotes(parts: string[]): string {
  const out: string[] = [];
  for (const p of parts.map(clean).filter(Boolean)) {
    if (!out.some((o) => o.toLowerCase().includes(p.toLowerCase()))) out.push(p);
  }
  return out.join(', ');
}

/** Split "Oak Lawn Library, Room 104" or cells "Oak Lawn Library | Community Room" into name + room. */
function splitName(raw: string): { name: string; notes: string[] } {
  const notes: string[] = [];
  let cells = raw.split('|').map((c) => c.trim()).filter((c) => c && !isNoise(c));
  if (cells.length > 1) {
    const rooms = cells.slice(1).filter(isRoomText);
    notes.push(...rooms);
    cells = cells.filter((c) => !rooms.includes(c));
  }
  let name = clean(cells.join(' '));
  const unit = TRAILING_UNIT_RE.exec(name);
  if (unit && unit.index > 2) {
    notes.push(unit[1]);
    name = clean(name.slice(0, unit.index));
  }
  return { name, notes };
}

interface Tail {
  /** City/state/ZIP to append to the street (", Dallas, TX 75232"). */
  tail: string;
  hasCity: boolean;
  /** Unit that followed the street ("Suite 100"), kept out of the address. */
  unit: string;
  /** Whatever's left after the city, e.g. more table cells. */
  rest: string;
}

/** Consume a trailing unit + city/zip after a street match. */
function takeTail(text: string): Tail {
  let unitText = '';
  let cellBreak = /^\s*\|/.test(text);
  let r = text.replace(/^\s*\|\s*/, ' ');
  const unit = UNIT_RE.exec(r);
  if (unit) {
    unitText = clean(unit[0]);
    r = r.slice(unit[0].length);
    cellBreak = /^\s*\|/.test(r);
  }
  r = r.replace(/^\s*\|\s*/, ' ');
  const cz = CITY_ZIP_RE.exec(r) ?? CITY_TX_RE.exec(r);
  if (cz) {
    const zip = cz[2] ? ` ${cz[2]}` : '';
    return { tail: `, ${clean(cz[1])}, TX${zip}`, hasCity: true, unit: unitText, rest: r.slice(cz.index + cz[0].length) };
  }
  // Table layout: a bare city in its own column ("… | Dallas | 7:00 AM").
  if (cellBreak) {
    const cells = r.split('|').map((c) => c.trim());
    const city = cells[0];
    const hasZip = !!cells[1] && /^\d{5}(-\d{4})?$/.test(cells[1]);
    const zip = hasZip ? ` ${cells[1].slice(0, 5)}` : '';
    if (/^[A-Za-z][A-Za-z .'-]{1,30}$/.test(city) && city.split(' ').length <= 3 && !isNoise(city) && !isRoomText(city)) {
      return { tail: `, ${city}, TX${zip}`, hasCity: true, unit: unitText, rest: cells.slice(hasZip ? 2 : 1).join(' | ') };
    }
  }
  return { tail: '', hasCity: false, unit: unitText, rest: r };
}

/** Room-like table cells in leftover text ("| Community Room | 7am-7pm"). */
function roomCells(rest: string): string[] {
  return rest.split('|').map((c) => c.trim()).filter(isRoomText);
}

export function extractSites(lines: string[]): ExtractedSite[] {
  const sites: ExtractedSite[] = [];
  const seen = new Set<string>();
  // Blank lines mean the source separates sites into blocks.
  const hasBlocks = lines.some((l) => !l.trim());
  // Lines already used as part of a site, so they can't become a name.
  const consumed = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const street = findStreet(line);
    if (!street) continue;

    const before = line.slice(0, street.index);
    const after = line.slice(street.index + street.match.length);
    const first = takeTail(after);
    let { tail, hasCity } = first;
    const notes: string[] = [first.unit];
    let rest = first.rest;
    let last = i;

    // City/ZIP on the next line (common in "name / address / city" blocks),
    // possibly after a line holding just a unit ("Suite 200").
    for (let j = i + 1; !hasCity && j <= i + 2 && j < lines.length && !findStreet(lines[j]); j++) {
      const next = takeTail(lines[j]);
      if (next.hasCity) {
        tail += next.tail;
        hasCity = true;
        notes.push(next.unit);
        rest += ` | ${next.rest}`;
      } else if (next.unit && !clean(next.rest) && j === i + 1) {
        notes.push(next.unit);
      } else {
        break;
      }
      consumed.add(j);
      last = j;
    }
    notes.push(...roomCells(rest));

    // Name: text left of the address on this line, else the nearest
    // meaningful line above (up to 3 back) that isn't itself an address.
    let name = '';
    const inline = splitName(before);
    if (inline.name.length >= 3 && !isNoise(inline.name)) {
      name = inline.name;
      notes.push(...inline.notes);
    } else {
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        if (consumed.has(j) || findStreet(lines[j]) || !lines[j].trim()) break;
        if (isNoise(lines[j])) continue;
        // "Grace Church / Fellowship Hall / 123 Main St": the line right
        // above the address is the room and the one above that is the name.
        const k = j - 1;
        if (isRoomText(lines[j]) && k >= 0 && lines[k].trim() && !consumed.has(k) && !findStreet(lines[k]) && !isNoise(lines[k])) {
          notes.push(lines[j]);
          const above = splitName(lines[k].split(CELL_SEP)[0]);
          name = above.name;
          notes.push(...above.notes);
          consumed.add(j);
          break;
        }
        // In a table row the name is usually the first cell.
        const own = splitName(lines[j].split(CELL_SEP)[0]);
        name = own.name;
        notes.push(...own.notes);
        break;
      }
    }
    consumed.add(i);

    // Lines after the address, up to the next blank line or address.
    const extra: number[] = [];
    let end = last + 1;
    while (end < lines.length && lines[end].trim() && !findStreet(lines[end])) extra.push(end++);
    const blockEnds = end >= lines.length || !lines[end].trim();
    if (hasBlocks && blockEnds && extra.length <= 2) {
      // "Florence City Hall / 851 FM 970, Florence, TX / Council Chambers": the
      // rest of the block describes this site, whatever words it uses.
      for (const k of extra) {
        if (!isNoise(lines[k])) notes.push(lines[k]);
        consumed.add(k);
      }
    } else {
      // "Oak Lawn Library / 4100 Cedar Springs Rd / Dallas, TX / Community Room":
      // take a room-ish line after the address, unless it heads the next site
      // (an address follows it directly).
      const next = last + 1;
      if (
        next < lines.length && !consumed.has(next) && isRoomText(lines[next]) &&
        !(next + 1 < lines.length && findStreet(lines[next + 1]))
      ) {
        notes.push(lines[next]);
        consumed.add(next);
      }
    }

    const address = clean(`${street.match}${tail}`);
    const key = `${name.toLowerCase()}|${address.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sites.push({ name, address, notes: joinNotes(notes) });
  }
  return sites;
}

/**
 * Split pasted text into lines, treating tabs (from copied HTML tables) as cell
 * breaks. Blank lines are kept (one per run) as block separators.
 */
export function linesFromText(text: string): string[] {
  return collapseBlanks(text.split(/\r?\n/).map((l) => l.replace(/\t+/g, CELL_SEP).trim()));
}

/** Keep single '' separators between content lines; drop leading, trailing and repeated blanks. */
export function collapseBlanks(lines: string[]): string[] {
  const out: string[] = [];
  for (const l of lines) {
    if (l) out.push(l);
    else if (out.length && out[out.length - 1]) out.push('');
  }
  if (out.length && !out[out.length - 1]) out.pop();
  return out;
}
