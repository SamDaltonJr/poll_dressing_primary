import { useMemo } from 'react';
import { activeLocations, getCounty } from '../../config/categorizeLocations';
import type { DressingRecord } from '../../types';

interface CountyStatsPanelProps {
  dressings: DressingRecord[];
}

interface CountyRow {
  county: string;
  total: number;
  dressed: number;
  claimed: number;
  available: number;
  pct: number;
}

export default function CountyStatsPanel({ dressings }: CountyStatsPanelProps) {
  const rows = useMemo(() => {
    const dressedSet = new Set(
      dressings.filter((d) => d.isDressed).map((d) => d.locationId),
    );
    const claimedSet = new Set(
      dressings.filter((d) => d.isClaimed && !d.isDressed).map((d) => d.locationId),
    );

    const countyMap = new Map<string, { total: number; dressed: number; claimed: number }>();

    for (const loc of activeLocations) {
      const county = getCounty(loc.id);
      const entry = countyMap.get(county) || { total: 0, dressed: 0, claimed: 0 };
      entry.total++;
      if (dressedSet.has(loc.id)) entry.dressed++;
      else if (claimedSet.has(loc.id)) entry.claimed++;
      countyMap.set(county, entry);
    }

    const result: CountyRow[] = [];
    for (const [county, data] of countyMap) {
      result.push({
        county,
        total: data.total,
        dressed: data.dressed,
        claimed: data.claimed,
        available: data.total - data.dressed - data.claimed,
        pct: data.total > 0 ? Math.round((data.dressed / data.total) * 100) : 0,
      });
    }

    return result.sort((a, b) => b.total - a.total);
  }, [dressings]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        total: acc.total + r.total,
        dressed: acc.dressed + r.dressed,
        claimed: acc.claimed + r.claimed,
        available: acc.available + r.available,
      }),
      { total: 0, dressed: 0, claimed: 0, available: 0 },
    );
  }, [rows]);

  const overallPct = totals.total > 0 ? Math.round((totals.dressed / totals.total) * 100) : 0;

  return (
    <>
      <div className="stats-panel">
        <div className="stat-card">
          <div className="stat-number">{rows.length}</div>
          <div className="stat-label">Counties</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{totals.total}</div>
          <div className="stat-label">Total Locations</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{totals.dressed}</div>
          <div className="stat-label">Dressed ({overallPct}%)</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${overallPct}%` }} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{totals.claimed}</div>
          <div className="stat-label">Claimed</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{totals.available}</div>
          <div className="stat-label">Still Needed</div>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="submissions-table">
          <thead>
            <tr>
              <th>County</th>
              <th>Total</th>
              <th>Dressed</th>
              <th>Claimed</th>
              <th>Available</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.county}>
                <td style={{ fontWeight: 600 }}>{row.county}</td>
                <td>{row.total}</td>
                <td>{row.dressed}</td>
                <td>{row.claimed}</td>
                <td>{row.available}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="progress-bar" style={{ flex: 1, minWidth: 60 }}>
                      <div className="progress-fill" style={{ width: `${row.pct}%` }} />
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', minWidth: 36, textAlign: 'right' }}>
                      {row.pct}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            <tr style={{ fontWeight: 700, borderTop: '2px solid var(--color-border)' }}>
              <td>Total</td>
              <td>{totals.total}</td>
              <td>{totals.dressed}</td>
              <td>{totals.claimed}</td>
              <td>{totals.available}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="progress-bar" style={{ flex: 1, minWidth: 60 }}>
                    <div className="progress-fill" style={{ width: `${overallPct}%` }} />
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', minWidth: 36, textAlign: 'right' }}>
                    {overallPct}%
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
