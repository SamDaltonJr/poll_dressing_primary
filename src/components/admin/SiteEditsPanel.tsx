import { useMemo, useState, type ChangeEvent } from 'react';
import { useCampaign } from '../../contexts/CampaignContext';
import { useLocations } from '../../contexts/LocationsContext';
import { useAdminAuth } from '../../contexts/AdminContext';
import { patchCountySites } from '../../services/pollingLocationService';
import { geocodeMany } from '../../services/batchGeocoder';
import { findCounty } from '../../config/texasCounties';
import { parseCsv, withinCountyBBox, type ParsedCsv } from '../../utils/locationImport';
import { haversineDistanceMiles } from '../../utils/geo';
import {
  EDIT_COLUMN_LABELS, addressChanges, checkRow, flagDuplicates, guessEditColumns, pinChanges, planEdits,
  type EditColumnKey, type EditColumnMap, type EditPlanRow,
} from '../../utils/siteEdits';
import type { StoredLocation } from '../../types';

type Step = 'input' | 'map' | 'review' | 'geocoding' | 'saving' | 'saved';

/**
 * New pin for a row: from the file's coordinates, or geocoded from a changed
 * address. null = the geocoder couldn't place it.
 */
type Pin = { latitude: number; longitude: number; outside: boolean; fromFile: boolean } | null;

/** Pins that move farther than this get a second look. */
const FAR_MILES = 10;

/**
 * Bulk corrections to sites already on the map (addresses, pins, room notes,
 * sizes) from one CSV that can cover many counties. Pins given in the file
 * are used as-is; otherwise a changed address is geocoded again so the pin
 * moves with it. Never adds or removes sites.
 */
export default function SiteEditsPanel() {
  const campaign = useCampaign();
  const { sets } = useLocations();
  const { allowedCounties, adminName } = useAdminAuth();

  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [columns, setColumns] = useState<EditColumnMap>({});
  const [rows, setRows] = useState<EditPlanRow[]>([]);
  const [pins, setPins] = useState<Record<number, Pin>>({});
  const [include, setInclude] = useState<Record<number, boolean>>({});
  const [geocoded, setGeocoded] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [step, setStep] = useState<Step>('input');
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const sitesByCounty = useMemo(() => {
    const m = new Map<string, StoredLocation[]>();
    for (const s of sets) m.set(s.county, [...(s.locations ?? [])].sort((a, b) => a.label.localeCompare(b.label)));
    return m;
  }, [sets]);

  function reset() {
    setText('');
    setParsed(null);
    setColumns({});
    setRows([]);
    setPins({});
    setInclude({});
    setGeocoded(false);
    setError('');
    setResult('');
    setStep('input');
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setText(await file.text());
  }

  function handleParse() {
    const p = parseCsv(text);
    if (p.rows.length === 0) {
      setError('No rows found. The first line should be the column headers.');
      return;
    }
    setError('');
    setParsed(p);
    setColumns(guessEditColumns(p.headers));
    setStep('map');
  }

  function handlePlan() {
    if (!parsed) return;
    if (!columns.county) {
      setError('Choose the County column.');
      return;
    }
    if (!columns.id && !columns.currentAddress && !columns.name) {
      setError('Choose a column to find each site by: Site ID, current address, or site name.');
      return;
    }
    if (!columns.address && !columns.coordinates && !(columns.latitude && columns.longitude) && !columns.notes && !columns.size) {
      setError('Choose at least one column to change: new address, new pin, notes, or size.');
      return;
    }
    setError('');
    setRows(planEdits(parsed.rows, columns, sets, allowedCounties));
    setPins({});
    setGeocoded(false);
    setStep('review');
  }

  function matchManually(rowNumber: number, siteId: string) {
    setRows((prev) => flagDuplicates(prev.map((r) => {
      if (r.rowNumber !== rowNumber) return checkRow(r);
      const site = sitesByCounty.get(r.county)?.find((l) => l.id === siteId) ?? null;
      return checkRow({ ...r, site, matchedBy: site ? 'manual' : null });
    })));
    setGeocoded(false);
  }

  const ready = rows.filter((r) => !r.problem);
  const skipped = rows.filter((r) => r.problem);

  async function handleGeocode() {
    // A pin in the file beats geocoding the address.
    const targets = ready.filter((r) => addressChanges(r) && !r.newPin);
    setStep('geocoding');
    setProgress({ done: 0, total: targets.length });
    const hits = await geocodeMany(targets.map((r) => r.newAddress!), (done, total) => setProgress({ done, total }));
    const nextPins: Record<number, Pin> = {};
    const nextInclude: Record<number, boolean> = {};
    const place = (county: string, latitude: number, longitude: number, fromFile: boolean): Pin => {
      const bbox = findCounty(county)?.bbox;
      return { latitude, longitude, fromFile, outside: !!bbox && !withinCountyBBox(latitude, longitude, bbox) };
    };
    targets.forEach((r, k) => {
      const hit = hits[k];
      nextPins[r.rowNumber] = hit ? place(r.county, hit.latitude, hit.longitude, false) : null;
    });
    for (const r of ready) {
      if (pinChanges(r)) nextPins[r.rowNumber] = place(r.county, r.newPin!.latitude, r.newPin!.longitude, true);
    }
    // Rows whose pin couldn't be placed (or landed outside the county) wait for
    // the admin to opt in; saving them keeps the old pin.
    for (const r of ready) {
      const pin = nextPins[r.rowNumber];
      nextInclude[r.rowNumber] = !(r.rowNumber in nextPins) || (pin != null && !pin.outside);
    }
    setPins(nextPins);
    setInclude(nextInclude);
    setGeocoded(true);
    setStep('review');
  }

  async function handleSave() {
    setStep('saving');
    const byCounty = new Map<string, Map<string, Partial<Omit<StoredLocation, 'id'>>>>();
    for (const r of ready) {
      if (!include[r.rowNumber] || !r.site) continue;
      const patch: Partial<Omit<StoredLocation, 'id'>> = {};
      if (addressChanges(r)) patch.address = r.newAddress!.trim();
      const pin = pins[r.rowNumber];
      if (pin && !pin.outside) {
        patch.latitude = pin.latitude;
        patch.longitude = pin.longitude;
      }
      if (r.newNotes != null) patch.notes = r.newNotes;
      if (r.newSize != null) patch.size = r.newSize;
      const m = byCounty.get(r.county) ?? new Map();
      m.set(r.site.id, patch);
      byCounty.set(r.county, m);
    }
    let saved = 0;
    const failed: string[] = [];
    for (const [county, patches] of byCounty) {
      try {
        saved += await patchCountySites(campaign.slug, county, patches, adminName);
      } catch (err) {
        failed.push(`${county} (${err instanceof Error ? err.message : 'save failed'})`);
      }
    }
    setResult(
      `Updated ${saved} site${saved === 1 ? '' : 's'} in ${byCounty.size - failed.length} ${byCounty.size - failed.length === 1 ? 'county' : 'counties'}.` +
      (failed.length ? ` Not saved: ${failed.join('; ')}.` : ''),
    );
    setStep('saved');
  }

  const includedCount = ready.filter((r) => include[r.rowNumber]).length;

  return (
    <div className="import-panel">
      <section className="import-section">
        <h3>Edit sites</h3>
        <p className="import-muted">
          Fix addresses, pins, room notes, or sizes on sites already on the map, across any number of counties in
          one CSV. Changed addresses get a new pin unless the file gives one. This never adds or removes sites.
        </p>

        {step === 'input' && (
          <>
            <p className="import-muted">
              The file needs a <strong>County</strong> column, a way to find each site (Site ID, site name, or its
              current address), and the new values: e.g. a <strong>Corrected Address</strong> column, or a pin as{' '}
              <strong>Latitude</strong>/<strong>Longitude</strong> or one “lat, lng” column copied from Google Maps.
              Blank cells leave that field alone. The admin <strong>Export CSV</strong> has all of these, so you can
              fix it in a spreadsheet and upload it here.
            </p>
            <div className="import-field">
              <span>File</span>
              <input type="file" accept=".csv,text/csv" onChange={handleFile} />
            </div>
            <textarea
              className="import-textarea"
              placeholder={'Location Name,County,Address in Tracker,Corrected Address\nCorinth City Hall,Denton,"3300 Corinth Pkwy., TX 76208","3300 Corinth Pkwy., Corinth, TX 76208"'}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
            />
            {error && <p className="import-warning">{error}</p>}
            <div className="import-actions">
              <button className="btn btn-primary" onClick={handleParse} disabled={!text.trim()}>Next: columns</button>
            </div>
          </>
        )}

        {step === 'map' && parsed && (
          <>
            <p className="import-muted">{parsed.rows.length} rows. Confirm which column holds each field:</p>
            <div className="import-column-grid">
              {(Object.keys(EDIT_COLUMN_LABELS) as EditColumnKey[]).map((key) => (
                <label key={key} className="import-field">
                  <span>{EDIT_COLUMN_LABELS[key]}</span>
                  <select
                    value={columns[key] ?? ''}
                    onChange={(e) => setColumns((prev) => ({ ...prev, [key]: e.target.value || undefined }))}
                  >
                    <option value="">— none —</option>
                    {parsed.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
              ))}
            </div>
            {error && <p className="import-warning">{error}</p>}
            <div className="import-actions">
              <button className="btn btn-secondary" onClick={reset}>Back</button>
              <button className="btn btn-primary" onClick={handlePlan}>Next: find sites</button>
            </div>
          </>
        )}

        {step === 'review' && (
          <>
            <div className="stats-panel">
              <div className="stat-card"><div className="stat-number">{rows.length}</div><div className="stat-label">Rows</div></div>
              <div className="stat-card"><div className="stat-number">{ready.length}</div><div className="stat-label">Ready to change</div></div>
              <div className={`stat-card${skipped.length ? ' stat-card-warning' : ''}`}>
                <div className={`stat-number${skipped.length ? ' stat-number-warning' : ''}`}>{skipped.length}</div>
                <div className="stat-label">Skipped</div>
              </div>
            </div>

            {skipped.length > 0 && (
              <>
                <h4>Skipped rows</h4>
                <div className="table-wrapper import-preview-table">
                  <table className="submissions-table">
                    <thead><tr><th>Row</th><th>County</th><th>Site</th><th>Why</th></tr></thead>
                    <tbody>
                      {skipped.map((r) => (
                        <tr key={r.rowNumber}>
                          <td>{r.rowNumber}</td>
                          <td>{r.county || '—'}</td>
                          <td className="address-cell">
                            {r.site?.label ?? r.fileName}
                            {!r.site && !r.blocked && (
                              <select
                                value=""
                                onChange={(e) => matchManually(r.rowNumber, e.target.value)}
                                aria-label={`Pick the site for row ${r.rowNumber}`}
                              >
                                <option value="">Pick the site…</option>
                                {(sitesByCounty.get(r.county) ?? []).map((s) => (
                                  <option key={s.id} value={s.id}>{s.label} · {s.address}</option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td>{r.problem}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {ready.length > 0 && (
              <>
                <h4>Changes</h4>
                <div className="table-wrapper import-preview-table">
                  <table className="submissions-table">
                    <thead>
                      <tr>
                        {geocoded && <th>Save</th>}
                        <th>County</th>
                        <th>Site</th>
                        <th>Change</th>
                        {geocoded && <th>Pin</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {ready.map((r) => {
                        const site = r.site!;
                        const pin = pins[r.rowNumber];
                        const moved = pin ? haversineDistanceMiles(site.latitude, site.longitude, pin.latitude, pin.longitude) : 0;
                        return (
                          <tr key={r.rowNumber}>
                            {geocoded && (
                              <td>
                                <input
                                  type="checkbox"
                                  checked={!!include[r.rowNumber]}
                                  onChange={(e) => setInclude((prev) => ({ ...prev, [r.rowNumber]: e.target.checked }))}
                                  aria-label={`Save row ${r.rowNumber}`}
                                />
                              </td>
                            )}
                            <td>{r.county}</td>
                            <td className="address-cell">
                              {site.label}
                              {r.matchedBy !== 'address' && r.matchedBy !== 'id' && (
                                <div className="location-notes-cell">
                                  Matched by {r.matchedBy}{r.matchedBy === 'similar name' ? ` (file: “${r.fileName}”)` : ''}
                                </div>
                              )}
                            </td>
                            <td className="address-cell">
                              {addressChanges(r) && (
                                <div>
                                  <span className="edit-old">{site.address}</span>
                                  <br />→ {r.newAddress}
                                </div>
                              )}
                              {pinChanges(r) && (
                                <div>Pin → {r.newPin!.latitude.toFixed(5)}, {r.newPin!.longitude.toFixed(5)}</div>
                              )}
                              {r.newNotes != null && r.newNotes !== (site.notes ?? '') && <div>Notes → {r.newNotes}</div>}
                              {r.newSize != null && r.newSize !== site.size && <div>Size {site.size ?? '—'} → {r.newSize}</div>}
                            </td>
                            {geocoded && (
                              <td>
                                {!(r.rowNumber in pins) ? '—'
                                  : pin == null ? <span className="import-warning-text">Not found; saving keeps the old pin</span>
                                  : pin.outside ? <span className="import-warning-text">Outside {r.county} County; saving keeps the old pin</span>
                                  : moved < 0.05 ? 'Same spot'
                                  : (
                                    <span className={moved > FAR_MILES ? 'import-warning-text' : undefined}>
                                      Moves {moved.toFixed(1)} mi{pin.fromFile ? ' (from file)' : ''}
                                    </span>
                                  )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="import-actions">
              <button className="btn btn-secondary" onClick={() => setStep('map')}>Back</button>
              {!geocoded ? (
                <button className="btn btn-primary" onClick={handleGeocode} disabled={ready.length === 0}>
                  Next: place pins
                </button>
              ) : (
                <button className="btn btn-primary" onClick={handleSave} disabled={includedCount === 0}>
                  Save {includedCount} change{includedCount === 1 ? '' : 's'}
                </button>
              )}
            </div>
          </>
        )}

        {step === 'geocoding' && (
          <div className="import-progress">
            <p>Placing pins… {progress.done}/{progress.total}</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {step === 'saving' && <p className="import-muted">Saving…</p>}

        {step === 'saved' && (
          <>
            <p>{result}</p>
            <div className="import-actions">
              <button className="btn btn-primary" onClick={reset}>Edit more sites</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
