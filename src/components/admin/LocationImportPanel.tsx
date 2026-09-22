import { useMemo, useState, type ChangeEvent } from 'react';
import { useCampaign } from '../../contexts/CampaignContext';
import { useLocations } from '../../contexts/LocationsContext';
import { useAdminAuth } from '../../contexts/AdminContext';
import { saveCountyLocations, deleteCountyLocations } from '../../services/pollingLocationService';
import { geocodeMany } from '../../services/batchGeocoder';
import { TEXAS_COUNTIES, findCounty } from '../../config/texasCounties';
import ConfirmDialog from '../common/ConfirmDialog';
import { extractSites, linesFromText, type ExtractedSite } from '../../utils/siteExtract';
import { extractPdfLines } from '../../utils/pdfText';
import {
  COLUMN_LABELS, CSV_TEMPLATE, applyImport, guessColumns, parseCsv, planImport, toImportRows, withinCountyBBox,
  type ColumnKey, type ColumnMap, type ImportPlan, type ListKind, type ParsedCsv, type PlannedRow,
} from '../../utils/locationImport';

type Step = 'input' | 'extract' | 'map' | 'preview' | 'geocoding' | 'review' | 'saved';

/** CSV/spreadsheet export, or unstructured text (PDF or copied from a web page). */
type Source = 'csv' | 'text';

const KIND_LABEL: Record<ListKind, string> = { ev: 'Early Voting', ed: 'Election Day' };

function formatTs(ts: { toDate?: () => Date } | null | undefined): string {
  const d = ts?.toDate?.();
  return d ? d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
}

/** A row is saveable once it has coordinates inside (or near) the county. */
function rowProblem(row: PlannedRow, bbox: [number, number, number, number]): string | null {
  if (row.latitude == null || row.longitude == null) return 'Address not found';
  if (!withinCountyBBox(row.latitude, row.longitude, bbox)) return 'Geocoded outside the county';
  return null;
}

export default function LocationImportPanel() {
  const campaign = useCampaign();
  const { sets } = useLocations();
  const { allowedCounties, role, adminName } = useAdminAuth();

  const countyOptions = useMemo(
    () => TEXAS_COUNTIES.filter((c) => !allowedCounties || allowedCounties.has(c.name)),
    [allowedCounties],
  );

  const [county, setCounty] = useState(() => (countyOptions.length === 1 ? countyOptions[0].name : ''));
  const [kind, setKind] = useState<ListKind>('ev');
  const [csvText, setCsvText] = useState('');
  const [source, setSource] = useState<Source>('csv');
  const [extracted, setExtracted] = useState<ExtractedSite[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [sourceNote, setSourceNote] = useState('');
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [columns, setColumns] = useState<ColumnMap>({});
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [skippedRows, setSkippedRows] = useState<number[]>([]);
  const [rows, setRows] = useState<PlannedRow[]>([]);
  const [manualCoords, setManualCoords] = useState<Record<number, string>>({});
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [step, setStep] = useState<Step>('input');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSummary, setSavedSummary] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const countyInfo = findCounty(county);
  const existingSet = sets.find((s) => s.county === county);
  const existing = useMemo(() => existingSet?.locations ?? [], [existingSet]);

  const visibleSets = useMemo(
    () => sets
      .filter((s) => !allowedCounties || allowedCounties.has(s.county))
      .sort((a, b) => a.county.localeCompare(b.county)),
    [sets, allowedCounties],
  );

  function reset() {
    setCsvText('');
    setExtracted([]);
    setSourceNote('');
    setParsed(null);
    setColumns({});
    setPlan(null);
    setRows([]);
    setSkippedRows([]);
    setManualCoords({});
    setError('');
    setStep('input');
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      setSource('csv');
      setCsvText(await file.text());
      return;
    }
    if (!countyInfo) {
      setError('Choose a county first.');
      return;
    }
    setSource('text');
    setExtracting(true);
    try {
      const lines = await extractPdfLines(file);
      if (lines.length === 0) {
        // Scanned PDF: no text layer. Let the admin type the sites instead.
        setExtracted([{ name: '', address: '' }]);
        setSourceNote(`"${file.name}" has no selectable text (it's probably a scanned image). Type the sites in below, or paste them from the county's website.`);
      } else {
        const sites = extractSites(lines);
        setExtracted(sites.length ? sites : [{ name: '', address: '' }]);
        setSourceNote(sites.length
          ? `Found ${sites.length} addresses in "${file.name}". Check each row against the PDF before continuing.`
          : `Couldn't find street addresses in "${file.name}". Type the sites in below.`);
      }
      setStep('extract');
    } catch (err) {
      console.error(err);
      setError("Couldn't read that PDF. Try copying its text and pasting it instead.");
    } finally {
      setExtracting(false);
    }
  }

  function handleExtractText() {
    setError('');
    if (!countyInfo) {
      setError('Choose a county first.');
      return;
    }
    const sites = extractSites(linesFromText(csvText));
    setExtracted(sites.length ? sites : [{ name: '', address: '' }]);
    setSourceNote(sites.length
      ? `Found ${sites.length} addresses. Check each row before continuing.`
      : "Couldn't find street addresses in that text. Type the sites in below.");
    setStep('extract');
  }

  function updateExtracted(i: number, patch: Partial<ExtractedSite>) {
    setExtracted((prev) => prev.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }

  function handleExtractedContinue() {
    const sites = extracted
      .map((x) => ({ name: x.name.trim(), address: x.address.trim() }))
      .filter((x) => x.name || x.address);
    if (sites.length === 0) {
      setError('Add at least one site.');
      return;
    }
    if (sites.some((x) => !x.name || !x.address)) {
      setError('Every row needs both a site name and an address (or delete the row).');
      return;
    }
    setError('');
    const p: ParsedCsv = {
      headers: ['Name', 'Address'],
      rows: sites.map((x) => ({ Name: x.name, Address: x.address })),
    };
    setParsed(p);
    const cols: ColumnMap = { name: 'Name', address: 'Address' };
    setColumns(cols);
    runPreview(p, cols);
  }

  function handleParse() {
    setError('');
    if (!countyInfo) {
      setError('Choose a county first.');
      return;
    }
    const p = parseCsv(csvText);
    if (p.rows.length === 0) {
      setError('No rows found. Make sure the first line is a header row.');
      return;
    }
    setParsed(p);
    setColumns(guessColumns(p.headers));
    setStep('map');
  }

  function handlePreview() {
    if (!parsed) return;
    if (!columns.name || !columns.address) {
      setError('Map at least the site name and street address columns.');
      return;
    }
    setError('');
    runPreview(parsed, columns);
  }

  function runPreview(parsedCsv: ParsedCsv, cols: ColumnMap) {
    const { rows: importRows, skipped } = toImportRows(parsedCsv, cols);
    setSkippedRows(skipped);
    const p = planImport(existing, importRows, kind);
    setPlan(p);
    setRows(p.rows);
    setStep('preview');
  }

  async function handleGeocode() {
    if (!plan) return;
    const targets = plan.rows.map((r, i) => ({ r, i })).filter(({ r }) => r.needsGeocode);
    setStep('geocoding');
    setProgress({ done: 0, total: targets.length });
    const hits = await geocodeMany(
      targets.map(({ r }) => r.address),
      (done, total) => setProgress({ done, total }),
    );
    const next = [...plan.rows];
    targets.forEach(({ i }, k) => {
      const hit = hits[k];
      if (hit) next[i] = { ...next[i], latitude: hit.latitude, longitude: hit.longitude };
    });
    setRows(next);
    setStep('review');
  }

  function applyManual(rowNumber: number) {
    const raw = manualCoords[rowNumber] ?? '';
    const m = raw.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if (!m) {
      alert('Enter coordinates as "lat, lng" — e.g. 32.7767, -96.7970 (right-click the spot in Google Maps to copy them).');
      return;
    }
    setRows((prev) => prev.map((r) => r.rowNumber === rowNumber
      ? { ...r, latitude: parseFloat(m[1]), longitude: parseFloat(m[2]) }
      : r));
  }

  const problems = useMemo(() => {
    if (!countyInfo) return [];
    return rows
      .map((r) => ({ row: r, problem: rowProblem(r, countyInfo.bbox) }))
      .filter((x) => x.problem);
  }, [rows, countyInfo]);

  const saveableRows = useMemo(
    () => (countyInfo ? rows.filter((r) => !rowProblem(r, countyInfo.bbox)) : []),
    [rows, countyInfo],
  );

  async function handleSave() {
    if (!countyInfo || !plan) return;
    setSaving(true);
    setError('');
    try {
      const next = applyImport(existing, saveableRows, kind, countyInfo.name);
      await saveCountyLocations(campaign.slug, countyInfo.name, next, kind, adminName);
      const matched = saveableRows.filter((r) => r.matchedId).length;
      setSavedSummary(
        `Saved ${saveableRows.length} ${KIND_LABEL[kind]} sites for ${countyInfo.name} County ` +
        `(${matched} matched existing, ${saveableRows.length - matched} new` +
        `${plan.dropped.length ? `, ${plan.dropped.length} removed from this list` : ''}` +
        `${problems.length ? `, ${problems.length} skipped` : ''}).`,
      );
      setStep('saved');
    } catch (err) {
      console.error(err);
      setError('Save failed. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCounty() {
    if (!deleteTarget) return;
    try {
      await deleteCountyLocations(campaign.slug, deleteTarget);
    } catch {
      alert('Failed to delete county locations.');
    } finally {
      setDeleteTarget(null);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'polling-locations-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const newCount = rows.filter((r) => !r.matchedId).length;
  const matchedCount = rows.length - newCount;
  const geocodeCount = rows.filter((r) => r.needsGeocode).length;

  return (
    <div className="import-panel">
      <section className="import-section">
        <h3>Imported counties</h3>
        {visibleSets.length === 0 ? (
          <p className="import-muted">
            No polling locations imported yet{allowedCounties ? ' for your counties' : ''}. Use the form below
            to upload each county's early voting and election day lists as they're published.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="submissions-table">
              <thead>
                <tr>
                  <th>County</th>
                  <th>EV sites</th>
                  <th>ED sites</th>
                  <th>Both</th>
                  <th>EV updated</th>
                  <th>ED updated</th>
                  <th>By</th>
                  {role === 'state' && <th></th>}
                </tr>
              </thead>
              <tbody>
                {visibleSets.map((s) => {
                  const ev = s.locations.filter((l) => l.ev).length;
                  const ed = s.locations.filter((l) => l.ed).length;
                  const both = s.locations.filter((l) => l.ev && l.ed).length;
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.county}</td>
                      <td>{ev}</td>
                      <td>{ed}</td>
                      <td>{both}</td>
                      <td>{formatTs(s.evUpdatedAt)}</td>
                      <td>{formatTs(s.edUpdatedAt)}</td>
                      <td>{s.updatedBy}</td>
                      {role === 'state' && (
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(s.county)}>
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="import-section">
        <h3>Import a county list</h3>

        {step === 'input' && (
          <>
            <div className="import-row">
              <label className="import-field">
                <span>County</span>
                <select value={county} onChange={(e) => setCounty(e.target.value)}>
                  <option value="">Choose a county…</option>
                  {countyOptions.map((c) => (
                    <option key={c.fips} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </label>
              <div className="import-field">
                <span>List</span>
                <div className="import-radio-group">
                  {(['ev', 'ed'] as ListKind[]).map((k) => (
                    <label key={k} className="import-radio">
                      <input type="radio" name="list-kind" checked={kind === k} onChange={() => setKind(k)} />
                      {KIND_LABEL[k]}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="import-field">
              <span>Source</span>
              <div className="import-radio-group">
                <label className="import-radio">
                  <input type="radio" name="import-source" checked={source === 'csv'} onChange={() => setSource('csv')} />
                  Spreadsheet (CSV)
                </label>
                <label className="import-radio">
                  <input type="radio" name="import-source" checked={source === 'text'} onChange={() => setSource('text')} />
                  PDF or copied text
                </label>
              </div>
            </div>
            <p className="import-muted">
              {source === 'csv' ? (
                <>
                  Upload a CSV (export from Excel/Google Sheets) or paste it below. Need the format?{' '}
                  <button type="button" className="link-button" onClick={downloadTemplate}>Download a template</button>.
                </>
              ) : (
                <>
                  Upload the county's PDF, or paste text copied from the PDF or the county's web page. Sites are
                  found by their street addresses; you'll review and fix every row before anything is saved.
                </>
              )}{' '}
              Importing replaces this county's current {KIND_LABEL[kind].toLowerCase()} list; sites that match an
              existing location keep their volunteer claims.
            </p>
            <input
              type="file"
              accept={source === 'csv' ? '.csv,text/csv,.pdf,application/pdf' : '.pdf,application/pdf,.csv,text/csv'}
              onChange={handleFile}
              disabled={extracting || !county}
            />
            {extracting && <p className="import-muted">Reading PDF…</p>}
            <textarea
              className="import-textarea"
              placeholder={source === 'csv'
                ? 'Name,Address,City,Zip\nOak Lawn Branch Library,4100 Cedar Springs Rd,Dallas,75219'
                : 'Oak Lawn Branch Library\n4100 Cedar Springs Rd, Dallas, TX 75219\n\nFriendship West Baptist Church\n2020 W Wheatland Rd, Dallas, TX 75232'}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={8}
            />
            <div className="import-actions">
              {source === 'csv' ? (
                <button className="btn btn-primary" onClick={handleParse} disabled={!csvText.trim() || !county}>
                  Next: map columns
                </button>
              ) : (
                <button className="btn btn-primary" onClick={handleExtractText} disabled={!csvText.trim() || !county}>
                  Next: find sites
                </button>
              )}
            </div>
          </>
        )}

        {step === 'extract' && (
          <>
            <p>
              <strong>{county} County</strong> ({KIND_LABEL[kind]}). {sourceNote}
            </p>
            <div className="table-wrapper import-preview-table">
              <table className="submissions-table import-extract-table">
                <thead>
                  <tr><th>#</th><th>Site name</th><th>Address (street, city, ZIP)</th><th></th></tr>
                </thead>
                <tbody>
                  {extracted.map((row, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>
                        <input
                          type="text"
                          className={!row.name.trim() ? 'import-input-missing' : ''}
                          value={row.name}
                          onChange={(e) => updateExtracted(i, { name: e.target.value })}
                          aria-label={`Site name, row ${i + 1}`}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className={!row.address.trim() ? 'import-input-missing' : ''}
                          value={row.address}
                          onChange={(e) => updateExtracted(i, { address: e.target.value })}
                          aria-label={`Address, row ${i + 1}`}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setExtracted((prev) => prev.filter((_, j) => j !== i))}
                          aria-label={`Remove row ${i + 1}`}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="import-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setExtracted((prev) => [...prev, { name: '', address: '' }])}>
                + Add row
              </button>
            </div>
            <div className="import-actions">
              <button className="btn btn-secondary" onClick={reset}>Back</button>
              <button className="btn btn-primary" onClick={handleExtractedContinue}>
                Next: preview {extracted.length} site{extracted.length === 1 ? '' : 's'}
              </button>
            </div>
          </>
        )}

        {step === 'map' && parsed && (
          <>
            <p>
              <strong>{parsed.rows.length}</strong> rows found for <strong>{county} County</strong>{' '}
              ({KIND_LABEL[kind]}). Confirm which column holds each field:
            </p>
            <div className="import-column-grid">
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
            <div className="import-actions">
              <button className="btn btn-secondary" onClick={reset}>Back</button>
              <button className="btn btn-primary" onClick={handlePreview}>Next: preview</button>
            </div>
          </>
        )}

        {step === 'preview' && plan && (
          <>
            <div className="stats-panel">
              <div className="stat-card"><div className="stat-number">{rows.length}</div><div className="stat-label">Sites in file</div></div>
              <div className="stat-card"><div className="stat-number">{matchedCount}</div><div className="stat-label">Match existing</div></div>
              <div className="stat-card"><div className="stat-number">{newCount}</div><div className="stat-label">New</div></div>
              <div className="stat-card"><div className="stat-number">{geocodeCount}</div><div className="stat-label">Need geocoding</div></div>
              {plan.dropped.length > 0 && (
                <div className="stat-card stat-card-warning"><div className="stat-number stat-number-warning">{plan.dropped.length}</div><div className="stat-label">Leaving this list</div></div>
              )}
            </div>
            {skippedRows.length > 0 && (
              <p className="import-warning">
                Skipping {skippedRows.length} row{skippedRows.length > 1 ? 's' : ''} missing a name or address
                (spreadsheet row{skippedRows.length > 1 ? 's' : ''} {skippedRows.slice(0, 15).join(', ')}{skippedRows.length > 15 ? '…' : ''}).
              </p>
            )}
            {plan.dropped.length > 0 && (
              <details className="import-details">
                <summary>{plan.dropped.length} current {KIND_LABEL[kind]} site{plan.dropped.length > 1 ? 's' : ''} not in this file</summary>
                <ul>
                  {plan.dropped.map((l) => <li key={l.id}>{l.label} — {l.address}</li>)}
                </ul>
              </details>
            )}
            <div className="table-wrapper import-preview-table">
              <table className="submissions-table">
                <thead>
                  <tr><th>Row</th><th>Name</th><th>Address</th><th>Match</th></tr>
                </thead>
                <tbody>
                  {rows.slice(0, 200).map((r) => (
                    <tr key={r.rowNumber}>
                      <td>{r.rowNumber}</td>
                      <td>{r.label}</td>
                      <td>{r.address}</td>
                      <td>{r.matchedBy ? `Existing (${r.matchedBy})` : 'New'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 200 && <p className="import-muted">Showing first 200 of {rows.length}.</p>}
            </div>
            <div className="import-actions">
              <button className="btn btn-secondary" onClick={() => setStep(source === 'text' ? 'extract' : 'map')}>Back</button>
              <button className="btn btn-primary" onClick={geocodeCount ? handleGeocode : () => setStep('review')}>
                {geocodeCount ? `Geocode ${geocodeCount} address${geocodeCount > 1 ? 'es' : ''}` : 'Next: review'}
              </button>
            </div>
          </>
        )}

        {step === 'geocoding' && (
          <div className="import-progress">
            <p>Looking up addresses… {progress.done}/{progress.total}</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
            </div>
            <p className="import-muted">Keep this tab open. Large counties can take a few minutes.</p>
          </div>
        )}

        {step === 'review' && (
          <>
            <p>
              <strong>{saveableRows.length}</strong> of {rows.length} sites ready to save
              {problems.length > 0 && <> · <strong className="import-warning-text">{problems.length}</strong> need attention</>}.
            </p>
            {problems.length > 0 && (
              <>
                <p className="import-muted">
                  Fix these by pasting coordinates (right-click the spot in Google Maps → click the numbers to copy),
                  or leave them — they'll be skipped and you can re-import later.
                </p>
                <div className="table-wrapper">
                  <table className="submissions-table">
                    <thead><tr><th>Row</th><th>Name</th><th>Address</th><th>Problem</th><th>Coordinates</th></tr></thead>
                    <tbody>
                      {problems.map(({ row, problem }) => (
                        <tr key={row.rowNumber}>
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
                                value={manualCoords[row.rowNumber] ?? ''}
                                onChange={(e) => setManualCoords((prev) => ({ ...prev, [row.rowNumber]: e.target.value }))}
                              />
                              <button className="btn btn-secondary btn-sm" onClick={() => applyManual(row.rowNumber)}>Set</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div className="import-actions">
              <button className="btn btn-secondary" onClick={reset} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || saveableRows.length === 0}>
                {saving ? 'Saving…' : `Save ${saveableRows.length} sites to ${county}`}
              </button>
            </div>
          </>
        )}

        {step === 'saved' && (
          <>
            <p className="import-success">{savedSummary}</p>
            <div className="import-actions">
              <button className="btn btn-primary" onClick={reset}>Import another list</button>
            </div>
          </>
        )}

        {error && <p className="error-text">{error}</p>}
      </section>

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete all polling locations for ${deleteTarget} County? Volunteer claims stay in the database but won't show until the county is re-imported.`}
          confirmLabel="Delete county"
          onConfirm={handleDeleteCounty}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
