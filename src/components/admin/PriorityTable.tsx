import { useMemo, useState } from 'react';
import { useCampaign } from '../../contexts/CampaignContext';
import { demShare, formatVotes } from '../../utils/turnout';
import type { DressingRecord, LocationStatus, MapMarker } from '../../types';

type FilterMode = 'open' | 'priority' | 'ranked';

interface PriorityTableProps {
  dressings: DressingRecord[];
  /** Sites in the admin's scope; ranks on them are statewide. */
  locations: MapMarker[];
}

const STATUS_LABEL: Record<LocationStatus, string> = {
  available: 'Available',
  claimed: 'Claimed',
  dressed: 'Dressed',
  retrieved: 'Retrieved',
};

/**
 * Early-voting sites in statewide turnout order, so coordinators can see which
 * of the busiest sites still need a volunteer.
 */
export default function PriorityTable({ dressings, locations }: PriorityTableProps) {
  const campaign = useCampaign();
  const [filter, setFilter] = useState<FilterMode>('open');
  const [search, setSearch] = useState('');

  const dressingMap = useMemo(() => new Map(dressings.map((d) => [d.locationId, d])), [dressings]);

  const rows = useMemo(() => locations
    .filter((l) => l.priorityRank)
    .sort((a, b) => a.priorityRank! - b.priorityRank!)
    .map((location) => {
      const d = dressingMap.get(location.id);
      const status: LocationStatus = d?.isRetrieved ? 'retrieved'
        : d?.isDressed ? 'dressed'
        : d?.isClaimed ? 'claimed'
        : 'available';
      return { location, dressing: d, status };
    }), [locations, dressingMap]);

  const priorityRows = useMemo(() => rows.filter((r) => r.location.priorityTier), [rows]);
  const openRows = useMemo(() => priorityRows.filter((r) => r.status === 'available'), [priorityRows]);
  const tierSummary = ([1, 2] as const).map((tier) => {
    const inTier = priorityRows.filter((r) => r.location.priorityTier === tier);
    return { tier, total: inTier.length, covered: inTier.filter((r) => r.status !== 'available').length };
  });
  const unranked = locations.filter((l) => l.type !== 'electionDayOnly' && !l.priorityRank).length;

  const shown = useMemo(() => {
    let result = filter === 'open' ? openRows : filter === 'priority' ? priorityRows : rows;
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((r) =>
        r.location.label.toLowerCase().includes(q) ||
        r.location.address.toLowerCase().includes(q) ||
        r.location.county.toLowerCase().includes(q));
    }
    return result;
  }, [filter, openRows, priorityRows, rows, search]);

  if (!campaign.priority) return null;

  if (rows.length === 0) {
    return (
      <div className="admin-empty">
        <p>
          No turnout numbers imported yet. Add them under Import Locations → Turnout numbers, and the busiest
          early-voting sites in Texas will be ranked here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="stats-panel">
        {tierSummary.map((t) => (
          <div key={t.tier} className="stat-card">
            <div className="stat-number">{t.covered}/{t.total}</div>
            <div className="stat-label">Priority {t.tier} sites claimed or dressed</div>
          </div>
        ))}
        <div className={`stat-card${openRows.length ? ' stat-card-warning' : ''}`}>
          <div className={`stat-number${openRows.length ? ' stat-number-warning' : ''}`}>{openRows.length}</div>
          <div className="stat-label">Priority sites still need a volunteer</div>
        </div>
      </div>
      <p className="import-muted">
        Ranked statewide by in-person early votes in the {campaign.priority.sourceLabel}. Priority 1 is the top{' '}
        {campaign.priority.tier1} in Texas, Priority 2 is ranks {campaign.priority.tier1 + 1}–{campaign.priority.tier2}.
        {' '}~ marks an estimate.
        {unranked > 0 && <> {unranked} early-voting site{unranked === 1 ? ' has' : 's have'} no turnout numbers and {unranked === 1 ? 'isn’t' : 'aren’t'} ranked.</>}
      </p>

      <div className="table-toolbar">
        <div className="filter-tabs">
          <button className={`filter-tab ${filter === 'open' ? 'active' : ''}`} onClick={() => setFilter('open')}>
            Needs a volunteer ({openRows.length})
          </button>
          <button className={`filter-tab ${filter === 'priority' ? 'active' : ''}`} onClick={() => setFilter('priority')}>
            All priority ({priorityRows.length})
          </button>
          <button className={`filter-tab ${filter === 'ranked' ? 'active' : ''}`} onClick={() => setFilter('ranked')}>
            All ranked ({rows.length})
          </button>
        </div>
        <div className="table-search">
          <input
            type="text"
            placeholder="Search by name, address, or county..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="table-wrapper">
        <table className="submissions-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Priority</th>
              <th>Location</th>
              <th>County</th>
              <th>Early votes</th>
              <th>Dem</th>
              <th>Status</th>
              <th>Volunteer</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ location: l, dressing: d, status }) => {
              const share = demShare(l);
              return (
                <tr key={l.id}>
                  <td>#{l.priorityRank}</td>
                  <td>
                    {l.priorityTier && (
                      <span className={`priority-badge priority-badge-${l.priorityTier}`}>
                        {l.priorityTier === 1 ? '★ ' : ''}P{l.priorityTier}
                      </span>
                    )}
                  </td>
                  <td className="address-cell">
                    {l.label}
                    <div className="location-notes-cell">{l.address}</div>
                  </td>
                  <td>{l.county}</td>
                  <td>{l.evEstimated ? '~' : ''}{formatVotes(l.evTotal ?? 0)}</td>
                  <td>{share == null ? '—' : `${Math.round(share * 100)}%`}</td>
                  <td>
                    <span className={`status-badge status-${status}`}>{STATUS_LABEL[status]}</span>
                  </td>
                  <td>{status === 'available' ? '—' : d?.volunteerName || '—'}</td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={8} className="import-muted">
                  {filter === 'open' ? 'Every priority site in view has a volunteer.' : 'No matching sites.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
