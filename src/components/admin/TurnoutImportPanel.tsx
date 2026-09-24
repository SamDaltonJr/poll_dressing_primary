import { useMemo, useState, type ChangeEvent } from 'react';
import { useCampaign } from '../../contexts/CampaignContext';
import { useLocations } from '../../contexts/LocationsContext';
import { useAdminAuth } from '../../contexts/AdminContext';
import { saveCountyTurnout } from '../../services/pollingLocationService';
import { findCounty } from '../../config/texasCounties';
import { parseCsv } from '../../utils/locationImport';
import { AUTO_MATCH_SCORE, matchCounty, type SiteMatch, type TurnoutRow } from '../../utils/turnoutMatch';
import { formatVotes } from '../../utils/turnout';
import type { StoredLocation, TurnoutPatch } from '../../types';

type Step = 'input' | 'review' | 'saving' | 'saved';

/** Site id → index of the chosen turnout row in that county, or -1 for none. */
type Choices = Record<string, number>;

interface CountyPlan {
  county: string;
  sites: StoredLocation[];
  rows: TurnoutRow[];
  matches: Map<string, SiteMatch>;
}

const FROM_FILE = '';

const HEADERS = {
  county: ['county', 'county name'],
  site: ['site', 'site name', 'name', 'location', 'location name', 'polling place', 'polling location', 'vote center', 'early voting site'],
  total: ['total', 'total ev', 'total_ev', 'ev total', 'evtotal', 'turnout', 'votes', 'total votes', 'ballots'],
  dem: ['dem', 'dem ev', 'dem_ev', 'democratic', 'democrat', 'dem votes'],
  rep: ['rep', 'rep ev', 'rep_ev', 'republican', 'rep votes'],
  estimated: ['estimated', 'estimate', 'est'],
} as const;

function findHeader(headers: string[], aliases: readonly string[]): string | undefined {
  const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return headers.find((h) => aliases.some((a) => norm(h) === norm(a)));
}

function toNum(v: string | undefined): number | undefined {
  if (v == null || v.trim() === '') return undefined;
  const n = Number(v.replace(/[,\s~]/g, ''));
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

/**
 * Loads per-site early-vote turnout (a county report, or a statewide file with
 * a County column) onto the sites already imported, matching by site name.
 * Never adds or removes sites; only the turnout numbers change.
 */
export default function TurnoutImportPanel() {
  const campaign = useCampaign();
  const { sets } = useLocations();
  const { allowedCounties, adminName } = useAdminAuth();

  const [text, setText] = useState('');
  const [countyChoice, setCountyChoice] = useState(FROM_FILE);
  const [step, setStep] = useState<Step>('input');
  const [error, setError] = useState('');
  const [plans, setPlans] = useState<CountyPlan[]>([]);
  const [skipped, setSkipped] = useState<Array<{ county: string; rows: number; reason: string }>>([]);
  const [choices, setChoices] = useState<Record<string, Choices>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [clearUnmatched, setClearUnmatched] = useState(true);
  const [result, setResult] = useState('');

  const importedCounties = useMemo(
    () => sets
      .filter((s) => !allowedCounties || allowedCounties.has(s.county))
      .map((s) => s.county)
      .sort(),
    [sets, allowedCounties],
  );

  function reset() {
    setText('');
    setPlans([]);
    setSkipped([]);
    setChoices({});
    setExpanded(new Set());
    setError('');
    setResult('');
    setStep('input');
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setText(await file.text());
  }

  function handleMatch() {
    setError('');
    const parsed = parseCsv(text);
    const col = {
      county: findHeader(parsed.headers, HEADERS.county),
      site: findHeader(parsed.headers, HEADERS.site),
      total: findHeader(parsed.headers, HEADERS.total),
      dem: findHeader(parsed.headers, HEADERS.dem),
      rep: findHeader(parsed.headers, HEADERS.rep),
      estimated: findHeader(parsed.headers, HEADERS.estimated),
    };
    if (!col.site || (!col.total && !col.dem)) {
      setError('The file needs a site name column and a Total column (or Dem and Rep columns). Found: ' + (parsed.headers.join(', ') || 'no header row'));
      return;
    }
    if (countyChoice === FROM_FILE && !col.county) {
      setError('This file has no County column. Pick the county it covers.');
      return;
    }

    // Group rows by county, normalizing the name to our county list.
    const byCounty = new Map<string, TurnoutRow[]>();
    for (const r of parsed.rows) {
      const site = (r[col.site] ?? '').trim();
      if (!site) continue;
      const dem = col.dem ? toNum(r[col.dem]) : undefined;
      const rep = col.rep ? toNum(r[col.rep]) : undefined;
      const total = (col.total ? toNum(r[col.total]) : undefined) ?? (dem != null || rep != null ? (dem ?? 0) + (rep ?? 0) : undefined);
      if (!total) continue;
      const rawCounty = countyChoice || (r[col.county!] ?? '').trim();
      const county = findCounty(rawCounty)?.name ?? rawCounty;
      const estimated = col.estimated ? /^(y|yes|true|1|x|est)/i.test((r[col.estimated] ?? '').trim()) : false;
      const list = byCounty.get(county) ?? [];
      list.push({ county, site, total, dem, rep, estimated });
      byCounty.set(county, list);
    }
    if (byCounty.size === 0) {
      setError('No rows with a site name and a vote count.');
      return;
    }

    const nextPlans: CountyPlan[] = [];
    const nextSkipped: typeof skipped = [];
    const nextChoices: Record<string, Choices> = {};
    const nextExpanded = new Set<string>();
    for (const [county, rows] of [...byCounty.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      if (allowedCounties && !allowedCounties.has(county)) {
        nextSkipped.push({ county, rows: rows.length, reason: 'not one of your counties' });
        continue;
      }
      const set = sets.find((s) => s.county === county);
      const sites = (set?.locations ?? []).filter((l) => l.ev);
      if (sites.length === 0) {
        nextSkipped.push({ county, rows: rows.length, reason: 'no early-voting sites imported yet' });
        continue;
      }
      const matches = matchCounty(sites, rows, county);
      const c: Choices = {};
      for (const s of sites) {
        const m = matches.get(s.id);
        c[s.id] = m && m.score >= AUTO_MATCH_SCORE ? m.row : -1;
      }
      nextChoices[county] = c;
      // Open the counties that need a look: a site without a sure match, or
      // a sizable turnout row nothing was matched to.
      const used = new Set(Object.values(c));
      const unsure = sites.some((s) => c[s.id] === -1);
      const orphan = rows.some((r, i) => !used.has(i) && r.total >= 1000);
      if (unsure || orphan) nextExpanded.add(county);
      nextPlans.push({ county, sites, rows, matches });
    }
    setPlans(nextPlans);
    setSkipped(nextSkipped);
    setChoices(nextChoices);
    setExpanded(nextExpanded);
    setStep('review');
  }

  function choose(county: string, siteId: string, row: number) {
    setChoices((prev) => ({ ...prev, [county]: { ...prev[county], [siteId]: row } }));
  }

  function toggle(county: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(county)) next.delete(county);
      else next.add(county);
      return next;
    });
  }

  const totals = useMemo(() => {
    let matched = 0;
    let unmatched = 0;
    for (const p of plans) {
      for (const s of p.sites) {
        if ((choices[p.county]?.[s.id] ?? -1) >= 0) matched++;
        else unmatched++;
      }
    }
    return { matched, unmatched };
  }, [plans, choices]);

  async function handleSave() {
    setStep('saving');
    setError('');
    let sites = 0;
    const failed: string[] = [];
    for (const p of plans) {
      const patches = new Map<string, TurnoutPatch | null>();
      for (const s of p.sites) {
        const i = choices[p.county]?.[s.id] ?? -1;
        if (i >= 0) {
          const r = p.rows[i];
          patches.set(s.id, { evTotal: r.total, evDem: r.dem, evRep: r.rep, evEstimated: r.estimated || undefined });
        } else if (clearUnmatched) {
          patches.set(s.id, null);
        }
      }
      if (patches.size === 0) continue;
      try {
        sites += await saveCountyTurnout(campaign.slug, p.county, patches, adminName);
      } catch (err) {
        failed.push(`${p.county} (${err instanceof Error ? err.message : 'save failed'})`);
      }
    }
    setResult(
      `Updated turnout on ${sites} sites in ${plans.length - failed.length} ${plans.length - failed.length === 1 ? 'county' : 'counties'}.` +
      (failed.length ? ` Not saved: ${failed.join('; ')}.` : ''),
    );
    setStep('saved');
  }

  return (
    <div className="import-panel">
      <section className="import-section">
        <h3>Turnout numbers</h3>
        <p className="import-muted">
          Load early-vote counts by site so the busiest sites in Texas get ranked and flagged as priorities.
          This only sets numbers on sites already imported; it never adds or removes sites.
        </p>

        {step === 'input' && (
          <>
            <p className="import-muted">
              Use a CSV with a site name column and a <strong>Total</strong> column. Optional: <strong>County</strong>{' '}
              (for a statewide file), <strong>Dem</strong>, <strong>Rep</strong>, and <strong>Estimated</strong> (yes for
              scaled or borrowed numbers).
            </p>
            <div className="import-row">
              <label className="import-field">
                <span>County</span>
                <select value={countyChoice} onChange={(e) => setCountyChoice(e.target.value)}>
                  <option value={FROM_FILE}>From the file's County column</option>
                  {importedCounties.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="import-field">
                <span>File</span>
                <input type="file" accept=".csv,text/csv" onChange={handleFile} />
              </label>
            </div>
            <textarea
              className="import-textarea"
              placeholder={'county,site,total,dem,rep\nDallas,Fretz Park Library,10039,6225,3814'}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
            />
            {error && <p className="import-warning">{error}</p>}
            <div className="import-actions">
              <button className="btn btn-primary" onClick={handleMatch} disabled={!text.trim()}>
                Match to sites
              </button>
            </div>
          </>
        )}

        {step === 'review' && (
          <>
            <div className="stats-panel">
              <div className="stat-card"><div className="stat-number">{plans.length}</div><div className="stat-label">Counties</div></div>
              <div className="stat-card"><div className="stat-number">{totals.matched}</div><div className="stat-label">Sites matched</div></div>
              <div className={`stat-card${totals.unmatched ? ' stat-card-warning' : ''}`}>
                <div className={`stat-number${totals.unmatched ? ' stat-number-warning' : ''}`}>{totals.unmatched}</div>
                <div className="stat-label">Sites without numbers</div>
              </div>
            </div>
            {skipped.length > 0 && (
              <p className="import-warning">
                Skipped: {skipped.map((s) => `${s.county} (${s.rows} rows, ${s.reason})`).join('; ')}.
              </p>
            )}
            <p className="import-muted">
              Check the counties that opened below: pick the matching row for any site left blank, and look at
              rows no site uses (usually a site that moved or was renamed).
            </p>

            {plans.map((p) => {
              const c = choices[p.county] ?? {};
              const used = new Set(Object.values(c));
              const orphans = p.rows
                .map((r, i) => ({ r, i }))
                .filter(({ i }) => !used.has(i))
                .sort((a, b) => b.r.total - a.r.total);
              const matched = p.sites.filter((s) => (c[s.id] ?? -1) >= 0).length;
              const open = expanded.has(p.county);
              const rowOptions = p.rows
                .map((r, i) => ({ r, i }))
                .sort((a, b) => a.r.site.localeCompare(b.r.site));
              return (
                <div key={p.county} className="turnout-county">
                  <button type="button" className="turnout-county-head" onClick={() => toggle(p.county)} aria-expanded={open}>
                    <span>{open ? '▾' : '▸'} {p.county}</span>
                    <span className="import-muted">
                      {matched}/{p.sites.length} sites matched · {orphans.length} unused row{orphans.length === 1 ? '' : 's'}
                    </span>
                  </button>
                  {open && (
                    <>
                      <div className="table-wrapper">
                        <table className="submissions-table">
                          <thead>
                            <tr><th>Site</th><th>Turnout row</th><th>Votes</th></tr>
                          </thead>
                          <tbody>
                            {p.sites.map((s) => {
                              const chosen = c[s.id] ?? -1;
                              const suggestion = p.matches.get(s.id);
                              const showSuggestion = chosen === -1 && suggestion && !used.has(suggestion.row);
                              return (
                                <tr key={s.id} className={chosen === -1 ? 'turnout-row-unmatched' : undefined}>
                                  <td className="address-cell">{s.label}</td>
                                  <td>
                                    <select
                                      value={chosen}
                                      onChange={(e) => choose(p.county, s.id, Number(e.target.value))}
                                      aria-label={`Turnout row for ${s.label}`}
                                    >
                                      <option value={-1}>— no numbers —</option>
                                      {rowOptions.map(({ r, i }) => (
                                        <option key={i} value={i}>
                                          {used.has(i) && i !== chosen ? '(used) ' : ''}{r.site} · {formatVotes(r.total)}
                                        </option>
                                      ))}
                                    </select>
                                    {showSuggestion && (
                                      <div className="location-notes-cell">
                                        Maybe “{p.rows[suggestion.row].site}”?{' '}
                                        <button type="button" className="link-button" onClick={() => choose(p.county, s.id, suggestion.row)}>
                                          Use it
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                  <td>{chosen >= 0 ? formatVotes(p.rows[chosen].total) : '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {orphans.length > 0 && (
                        <p className="import-muted">
                          Rows no site uses: {orphans.map(({ r }) => `${r.site} (${formatVotes(r.total)})`).join(', ')}
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            <label className="import-radio">
              <input type="checkbox" checked={clearUnmatched} onChange={(e) => setClearUnmatched(e.target.checked)} />
              Clear old numbers on sites left without a row (counties in this file only)
            </label>
            <div className="import-actions">
              <button className="btn btn-secondary" onClick={reset}>Back</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={plans.length === 0}>
                Save turnout for {plans.length} {plans.length === 1 ? 'county' : 'counties'}
              </button>
            </div>
          </>
        )}

        {step === 'saving' && <p className="import-muted">Saving…</p>}

        {step === 'saved' && (
          <>
            <p>{result}</p>
            <div className="import-actions">
              <button className="btn btn-primary" onClick={reset}>Load another file</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
