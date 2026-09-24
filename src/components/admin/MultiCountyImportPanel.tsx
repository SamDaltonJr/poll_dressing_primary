import { useState, type ChangeEvent } from 'react';
import { useCampaign } from '../../contexts/CampaignContext';
import { useLocations } from '../../contexts/LocationsContext';
import { useAdminAuth } from '../../contexts/AdminContext';
import { saveCountyLocations } from '../../services/pollingLocationService';
import { geocodeMany } from '../../services/batchGeocoder';
import { findCounty } from '../../config/texasCounties';
import {
  COLUMN_LABELS, applyImport, guessColumns, parseCsv, planImport, withinCountyBBox,
  type ColumnKey, type ColumnMap, type ListKind, type ParsedCsv, type PlannedRow,
} from '../../utils/locationImport';
import { guessCountyColumn, splitByCounty } from '../../utils/multiCountyImport';
import type { StoredLocation } from '../../types';

type Step = 'input' | 'map' | 'preview' | 'geocoding' | 'review' | 'saving' | 'saved';

const KIND_LABEL: Record<ListKind, string> = { ev: 'Early Voting', ed: 'Election Day' };

interface CountyPlan {
  county: string;
  bbox: [number, number, number, number];
  rows: PlannedRow[];
  /** Sites currently on this list that the file doesn't include. */
  dropped: StoredLocation[];
  /** Sites currently on this list, for context. */
  currentCount: number;
  /** Rows matched by site name whose address differs from the map's. */
  nameMatches: Array<{ label: string; mapAddress: string; fileAddress: string }>;
  include: boolean;
}

interface SaveResult {
  county: string;
  saved: number;
  matched: number;
  dropped: number;
  skipped: number;
  error?: string;
}

function rowProblem(row: PlannedRow, bbox: [number, number, number, number]): string | null {
  if (row.latitude == null || row.longitude == null) return 'Address not found';
  if (!withinCountyBBox(row.latitude, row.longitude, bbox)) return 'Geocoded outside the county';
  return null;
}

const rowKey = (county: string, rowNumber: number) => `${county}:${rowNumber}`;

/**
 * One CSV with a County column → early voting or election day lists for many
 * counties at once. Each county is planned, geocoded and saved exactly like a
 * single-county import, and only the chosen list is replaced.
 */
export default function MultiCountyImportPanel() {
  const campaign = useCampaign();
  const { sets } = useLocations();
  const { allowedCounties, adminName } = useAdminAuth();

  // No default: replacing the wrong list in 18 counties is a bad afternoon.
  const [kind, setKind] = useState<ListKind | null>(null);
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [columns, setColumns] = useState<ColumnMap>({});
  const [countyColumn, setCountyColumn] = useState('');
  const [keepExisting, setKeepExisting] = useState(true);
  const [plans, setPlans] = useState<CountyPlan[]>([]);
  const [skipped, setSkipped] = useState<number[]>([]);
  const [unknown, setUnknown] = useState<Array<{ value: string; rowNumbers: number[] }>>([]);
  const [outOfScope, setOutOfScope] = useState<string[]>([]);
  const [manualCoords, setManualCoords] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState({ done: 0, total: 0, label: '' });
  const [results, setResults] = useState<SaveResult[]>([]);
  const [step, setStep] = useState<Step>('input');
  const [error, setError] = useState('');

  function reset() {
    setText('');
    setParsed(null);
    setColumns({});
    setCountyColumn('');
    setPlans([]);
    setSkipped([]);
    setUnknown([]);
    setOutOfScope([]);
    setManualCoords({});
    setResults([]);
    setError('');
    setStep('input');
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setText(await file.text());
  }

  function handleParse() {
    setError('');
    const p = parseCsv(text);
    if (p.rows.length === 0) {
      setError('No rows found. Make sure the first line is a header row.');
      return;
    }
    const county = guessCountyColumn(p.headers) ?? '';
    const cols = guessColumns(p.headers.filter((h) => h !== county));
    setParsed(p);
    setCountyColumn(county);
    setColumns(cols);
    setStep('map');
  }

  function handlePreview() {
    if (!parsed || !kind) return;
    if (!countyColumn || !columns.name || !columns.address) {
      setError('Map the county, site name and street address columns.');
      return;
    }
    setError('');
    const split = splitByCounty(parsed, columns, countyColumn);
    const inScope = split.groups.filter((g) => !allowedCounties || allowedCounties.has(g.county));
    const next: CountyPlan[] = inScope.map((g) => {
      const existing = sets.find((s) => s.county === g.county)?.locations ?? [];
      const byId = new Map(existing.map((l) => [l.id, l]));
      const plan = planImport(existing, g.rows, kind);
      const nameMatches = plan.rows
        .filter((r) => r.matchedBy === 'name')
        .map((r) => ({ label: r.label, mapAddress: byId.get(r.matchedId!)?.address ?? '', fileAddress: r.address }));
      // A site already on the map just joins this list: its name, address and
      // pin stay as they are (they may have been corrected by hand).
      const rows = !keepExisting ? plan.rows : plan.rows.map((r) => {
        const m = r.matchedId ? byId.get(r.matchedId) : undefined;
        return m
          ? { ...r, label: m.label, address: m.address, latitude: m.latitude, longitude: m.longitude, needsGeocode: false }
          : r;
      });
      return {
        county: g.county,
        bbox: findCounty(g.county)!.bbox,
        rows,
        dropped: plan.dropped,
        currentCount: existing.filter((l) => l[kind]).length,
        nameMatches,
        include: true,
      };
    });
    setPlans(next);
    setSkipped(split.skipped);
    setUnknown(split.unknown);
    setOutOfScope(split.groups.filter((g) => !inScope.includes(g)).map((g) => g.county));
    setStep('preview');
  }

  const included = plans.filter((p) => p.include);

  async function handleGeocode() {
    const targets = included.flatMap((p) =>
      p.rows.map((r, i) => ({ county: p.county, i, address: r.address })).filter((t) => p.rows[t.i].needsGeocode));
    if (targets.length === 0) {
      setStep('review');
      return;
    }
    setStep('geocoding');
    setProgress({ done: 0, total: targets.length, label: '' });
    const hits = await geocodeMany(
      targets.map((t) => t.address),
      (done, total) => setProgress({ done, total, label: '' }),
    );
    setPlans((prev) => prev.map((p) => {
      const mine = targets.map((t, k) => ({ t, hit: hits[k] })).filter(({ t }) => t.county === p.county);
      if (mine.length === 0) return p;
      const rows = [...p.rows];
      for (const { t, hit } of mine) {
        if (hit) rows[t.i] = { ...rows[t.i], latitude: hit.latitude, longitude: hit.longitude };
      }
      return { ...p, rows };
    }));
    setStep('review');
  }

  function applyManual(county: string, rowNumber: number) {
    const raw = manualCoords[rowKey(county, rowNumber)] ?? '';
    const m = raw.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if (!m) {
      alert('Enter coordinates as "lat, lng" — e.g. 32.7767, -96.7970 (right-click the spot in Google Maps to copy them).');
      return;
    }
    setPlans((prev) => prev.map((p) => p.county !== county ? p : {
      ...p,
      rows: p.rows.map((r) => r.rowNumber === rowNumber
        ? { ...r, latitude: parseFloat(m[1]), longitude: parseFloat(m[2]) }
        : r),
    }));
  }

  const problems = included.flatMap((p) => p.rows
    .map((row) => ({ county: p.county, row, problem: rowProblem(row, p.bbox) }))
    .filter((x) => x.problem));

  const saveable = (p: CountyPlan) => p.rows.filter((r) => !rowProblem(r, p.bbox));
  const saveableTotal = included.reduce((n, p) => n + saveable(p).length, 0);

  async function handleSave() {
    if (!kind) return;
    // Counties where nothing geocoded are left alone rather than emptied.
    const toSave = included.filter((p) => saveable(p).length > 0);
    setStep('saving');
    const out: SaveResult[] = [];
    for (const [i, p] of toSave.entries()) {
      setProgress({ done: i, total: toSave.length, label: p.county });
      const rows = saveable(p);
      const result: SaveResult = {
        county: p.county,
        saved: rows.length,
        matched: rows.filter((r) => r.matchedId).length,
        dropped: p.dropped.length,
        skipped: p.rows.length - rows.length,
      };
      try {
        // Merge into the county's sites as of the Save click (the live
        // snapshot), not as of the preview a few minutes earlier.
        const existing = sets.find((s) => s.county === p.county)?.locations ?? [];
        await saveCountyLocations(campaign.slug, p.county, applyImport(existing, rows, kind, p.county), kind, adminName);
      } catch (err) {
        console.error(err);
        result.error = 'Save failed';
      }
      out.push(result);
    }
    for (const p of included) {
      if (!toSave.includes(p)) {
        out.push({ county: p.county, saved: 0, matched: 0, dropped: 0, skipped: p.rows.length, error: 'No sites could be placed; not saved' });
      }
    }
    setProgress({ done: toSave.length, total: toSave.length, label: '' });
    setResults(out);
    setStep('saved');
  }

  const totals = included.reduce(
    (t, p) => {
      const matched = p.rows.filter((r) => r.matchedId).length;
      return {
        rows: t.rows + p.rows.length,
        matched: t.matched + matched,
        fresh: t.fresh + p.rows.length - matched,
        geocode: t.geocode + p.rows.filter((r) => r.needsGeocode).length,
        dropped: t.dropped + p.dropped.length,
      };
    },
    { rows: 0, matched: 0, fresh: 0, geocode: 0, dropped: 0 },
  );
  const kindLabel = kind ? KIND_LABEL[kind] : '';

  return (
    <div className="import-panel">
      <section className="import-section">
        <h3>Import many counties at once</h3>

        {step === 'input' && (
          <>
            <div className="import-field">
              <span>List</span>
              <div className="import-radio-group">
                {(['ev', 'ed'] as ListKind[]).map((k) => (
                  <label key={k} className="import-radio">
                    <input type="radio" name="multi-list-kind" checked={kind === k} onChange={() => setKind(k)} />
                    {KIND_LABEL[k]}
                  </label>
                ))}
              </div>
            </div>
            <p className="import-muted">
              Upload one CSV that covers several counties, with a <strong>County</strong> column plus the usual
              site name and address columns. For each county in the file, this replaces that county's current{' '}
              {kind ? KIND_LABEL[kind].toLowerCase() : 'early voting or election day'} list, the same as importing
              it on its own. The other list is untouched, and sites that match an existing location keep their
              volunteer claims.
            </p>
            <input type="file" accept=".csv,text/csv" onChange={handleFile} disabled={!kind} />
            <textarea
              className="import-textarea"
              placeholder={'County,Name,Address,City,Zip\nDallas,Oak Lawn Branch Library,4100 Cedar Springs Rd,Dallas,75219\nTarrant,Fort Worth Central Library,500 W 3rd St,Fort Worth,76102'}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
            />
            <div className="import-actions">
              <button className="btn btn-primary" onClick={handleParse} disabled={!text.trim() || !kind}>
                Next: map columns
              </button>
            </div>
          </>
        )}

        {step === 'map' && parsed && (
          <>
            <p>
              <strong>{parsed.rows.length}</strong> rows found ({kindLabel}). Confirm which column holds each field:
            </p>
            <div className="import-column-grid">
              <label className="import-field">
                <span>County *</span>
                <select value={countyColumn} onChange={(e) => setCountyColumn(e.target.value)}>
                  <option value="">— none —</option>
                  {parsed.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>
              {(Object.keys(COLUMN_LABELS) as ColumnKey[]).map((key) => (
                <label key={key} className="import-field">
                  <span>{COLUMN_LABELS[key]}{key === 'name' || key === 'address' ? ' *' : ''}</span>
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
            <label className="import-radio">
              <input type="checkbox" checked={keepExisting} onChange={(e) => setKeepExisting(e.target.checked)} />
              Leave sites already on the map as they are and just add them to this list (recommended: keeps
              names, addresses and pins that were corrected by hand)
            </label>
            <div className="import-actions">
              <button className="btn btn-secondary" onClick={reset}>Back</button>
              <button className="btn btn-primary" onClick={handlePreview}>Next: preview</button>
            </div>
          </>
        )}

        {step === 'preview' && (
          <>
            <div className="stats-panel">
              <div className="stat-card"><div className="stat-number">{included.length}</div><div className="stat-label">Counties</div></div>
              <div className="stat-card"><div className="stat-number">{totals.rows}</div><div className="stat-label">Sites in file</div></div>
              <div className="stat-card"><div className="stat-number">{totals.matched}</div><div className="stat-label">Match existing</div></div>
              <div className="stat-card"><div className="stat-number">{totals.fresh}</div><div className="stat-label">New</div></div>
              <div className="stat-card"><div className="stat-number">{totals.geocode}</div><div className="stat-label">Need geocoding</div></div>
              {totals.dropped > 0 && (
                <div className="stat-card stat-card-warning"><div className="stat-number stat-number-warning">{totals.dropped}</div><div className="stat-label">Leaving their list</div></div>
              )}
            </div>
            {unknown.length > 0 && (
              <p className="import-warning">
                Skipping rows whose county isn't a Texas county:{' '}
                {unknown.map((u) => `"${u.value}" (row${u.rowNumbers.length > 1 ? 's' : ''} ${u.rowNumbers.slice(0, 5).join(', ')}${u.rowNumbers.length > 5 ? '…' : ''})`).join('; ')}.
              </p>
            )}
            {outOfScope.length > 0 && (
              <p className="import-warning">
                Skipping counties you don't manage: {outOfScope.join(', ')}.
              </p>
            )}
            {skipped.length > 0 && (
              <p className="import-warning">
                Skipping {skipped.length} row{skipped.length > 1 ? 's' : ''} missing a name or address
                (spreadsheet row{skipped.length > 1 ? 's' : ''} {skipped.slice(0, 15).join(', ')}{skipped.length > 15 ? '…' : ''}).
              </p>
            )}
            <div className="table-wrapper import-preview-table">
              <table className="submissions-table">
                <thead>
                  <tr>
                    <th>Import</th><th>County</th><th>Current {kindLabel} sites</th><th>Sites in file</th>
                    <th>Match existing</th><th>New</th><th>Need geocoding</th><th>Leaving list</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => {
                    const matched = p.rows.filter((r) => r.matchedId).length;
                    return (
                      <tr key={p.county}>
                        <td>
                          <input
                            type="checkbox"
                            checked={p.include}
                            onChange={(e) => setPlans((prev) => prev.map((x) => x.county === p.county ? { ...x, include: e.target.checked } : x))}
                            aria-label={`Import ${p.county}`}
                          />
                        </td>
                        <td style={{ fontWeight: 600 }}>{p.county}</td>
                        <td>{p.currentCount}</td>
                        <td>{p.rows.length}</td>
                        <td>{matched}</td>
                        <td>{p.rows.length - matched}</td>
                        <td>{p.rows.filter((r) => r.needsGeocode).length}</td>
                        <td className={p.dropped.length ? 'import-warning-text' : ''}>{p.dropped.length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {included.filter((p) => p.nameMatches.length > 0).map((p) => (
              <details key={`${p.county}-name`} className="import-details">
                <summary>
                  {p.county}: {p.nameMatches.length} matched by site name, with a different address
                  {keepExisting ? ' (the map keeps its address)' : " (the map takes the file's address)"}
                </summary>
                <ul>
                  {p.nameMatches.map((m, i) => (
                    <li key={i}>{m.label}: map has {m.mapAddress}; file has {m.fileAddress}</li>
                  ))}
                </ul>
              </details>
            ))}
            {included.filter((p) => p.dropped.length > 0).map((p) => (
              <details key={p.county} className="import-details">
                <summary>{p.county}: {p.dropped.length} current {kindLabel} site{p.dropped.length > 1 ? 's' : ''} not in this file</summary>
                <ul>
                  {p.dropped.map((l) => <li key={l.id}>{l.label} — {l.address}</li>)}
                </ul>
              </details>
            ))}
            <div className="import-actions">
              <button className="btn btn-secondary" onClick={() => setStep('map')}>Back</button>
              <button className="btn btn-primary" onClick={handleGeocode} disabled={included.length === 0}>
                {totals.geocode ? `Geocode ${totals.geocode} address${totals.geocode > 1 ? 'es' : ''}` : 'Next: review'}
              </button>
            </div>
          </>
        )}

        {(step === 'geocoding' || step === 'saving') && (
          <div className="import-progress">
            <p>
              {step === 'geocoding'
                ? `Looking up addresses… ${progress.done}/${progress.total}`
                : `Saving ${progress.label} County (${progress.done + 1} of ${progress.total})…`}
            </p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
            </div>
            <p className="import-muted">Keep this tab open. A thousand addresses takes several minutes.</p>
          </div>
        )}

        {step === 'review' && (
          <>
            <p>
              <strong>{saveableTotal}</strong> of {totals.rows} sites in {included.length} count{included.length === 1 ? 'y' : 'ies'} ready to save
              {problems.length > 0 && <> · <strong className="import-warning-text">{problems.length}</strong> need attention</>}.
            </p>
            {problems.length > 0 && (
              <>
                <p className="import-muted">
                  Fix these by pasting coordinates (right-click the spot in Google Maps → click the numbers to copy),
                  or leave them — they'll be skipped and you can add them later.
                </p>
                <div className="table-wrapper">
                  <table className="submissions-table">
                    <thead><tr><th>County</th><th>Row</th><th>Name</th><th>Address</th><th>Problem</th><th>Coordinates</th></tr></thead>
                    <tbody>
                      {problems.map(({ county, row, problem }) => {
                        const key = rowKey(county, row.rowNumber);
                        return (
                          <tr key={key}>
                            <td>{county}</td>
                            <td>{row.rowNumber}</td>
                            <td>{row.label}</td>
                            <td>
                              <a href={`https://www.google.com/maps/search/${encodeURIComponent(`${row.label} ${row.address}`)}`} target="_blank" rel="noreferrer">
                                {row.address}
                              </a>
                            </td>
                            <td>{problem}</td>
                            <td>
                              <div className="import-manual">
                                <input
                                  type="text"
                                  placeholder="32.7767, -96.7970"
                                  value={manualCoords[key] ?? ''}
                                  onChange={(e) => setManualCoords((prev) => ({ ...prev, [key]: e.target.value }))}
                                />
                                <button className="btn btn-secondary btn-sm" onClick={() => applyManual(county, row.rowNumber)}>Set</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <p className="import-muted">
              Saving replaces the {kindLabel.toLowerCase()} list in: {included.map((p) => p.county).join(', ')}.
            </p>
            <div className="import-actions">
              <button className="btn btn-secondary" onClick={reset}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saveableTotal === 0}>
                Save {saveableTotal} sites to {included.length} count{included.length === 1 ? 'y' : 'ies'}
              </button>
            </div>
          </>
        )}

        {step === 'saved' && (
          <>
            <p className={results.some((r) => r.error) ? 'import-warning' : 'import-success'}>
              Saved {kindLabel} sites for {results.filter((r) => !r.error).length} of {results.length} counties.
              {results.some((r) => r.error) && ' Counties marked below were not saved; re-import them on their own.'}
            </p>
            <div className="table-wrapper">
              <table className="submissions-table">
                <thead><tr><th>County</th><th>Saved</th><th>Matched existing</th><th>New</th><th>Removed from list</th><th>Skipped</th><th>Status</th></tr></thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.county}>
                      <td style={{ fontWeight: 600 }}>{r.county}</td>
                      <td>{r.saved}</td>
                      <td>{r.matched}</td>
                      <td>{r.saved - r.matched}</td>
                      <td>{r.dropped}</td>
                      <td>{r.skipped}</td>
                      <td className={r.error ? 'import-warning-text' : ''}>{r.error ?? 'Saved'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="import-actions">
              <button className="btn btn-primary" onClick={reset}>Import another file</button>
            </div>
          </>
        )}

        {error && <p className="error-text">{error}</p>}
      </section>
    </div>
  );
}
