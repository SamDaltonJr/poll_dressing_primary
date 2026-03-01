import React, { useState, useMemo } from 'react';
import { revertDressing, unclaimLocation, dismissReports } from '../../services/dressingService';
import ConfirmDialog from '../common/ConfirmDialog';
import DressingEditModal from './DressingEditModal';
import AdminDressModal from './AdminDressModal';
import { allLocations, getCounty } from '../../config/categorizeLocations';
import { MARKER_TYPES } from '../../config/constants';
import { findNearbyUnclaimed } from '../../utils/geo';
import type { DressingRecord, MapMarker, LocationStatus } from '../../types';

type FilterMode = 'all' | 'available' | 'claimed' | 'dressed' | 'reported';
type SortKey = 'location' | 'type' | 'county' | 'address' | 'status' | 'volunteer' | 'signs';
type SortDir = 'asc' | 'desc';

interface DressingTableProps {
  dressings: DressingRecord[];
}

interface Row {
  location: MapMarker;
  dressing?: DressingRecord;
  status: LocationStatus;
  county: string;
}

function NearbyPanel({ location, claimedOrDressedIds }: { location: MapMarker; claimedOrDressedIds: Set<string> }) {
  const nearby = useMemo(
    () => findNearbyUnclaimed(location.latitude, location.longitude, allLocations, claimedOrDressedIds, location.id),
    [location, claimedOrDressedIds],
  );

  if (nearby.length === 0) {
    return <p className="nearby-empty">No unclaimed locations within 5 miles.</p>;
  }

  return (
    <div>
      <strong>Nearby unclaimed locations:</strong>
      <ul className="nearby-list-admin">
        {nearby.map((n) => (
          <li key={n.location.id} className="nearby-item-admin">
            <span className="nearby-item-name">{n.location.label}</span>
            <span className="nearby-item-address">{n.location.address}</span>
            <span className="nearby-item-distance">{n.distanceMiles.toFixed(1)} mi</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DressingTable({ dressings }: DressingTableProps) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('location');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [revertTarget, setRevertTarget] = useState<Row | null>(null);
  const [unclaimTarget, setUnclaimTarget] = useState<Row | null>(null);
  const [editTarget, setEditTarget] = useState<Row | null>(null);
  const [dressTarget, setDressTarget] = useState<Row | null>(null);
  const [dismissTarget, setDismissTarget] = useState<Row | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const dressingMap = useMemo(() => {
    const m = new Map<string, DressingRecord>();
    for (const d of dressings) m.set(d.locationId, d);
    return m;
  }, [dressings]);

  const claimedOrDressedIds = useMemo(() => {
    const set = new Set<string>();
    for (const d of dressings) {
      if (d.isClaimed || d.isDressed) set.add(d.locationId);
    }
    return set;
  }, [dressings]);

  const locations = useMemo(() => allLocations, []);

  const rows = useMemo<Row[]>(() =>
    locations.map((loc) => {
      const d = dressingMap.get(loc.id);
      let status: LocationStatus = 'available';
      if (d?.isDressed) status = 'dressed';
      else if (d?.isClaimed) status = 'claimed';
      return { location: loc, dressing: d, status, county: getCounty(loc.id) };
    }),
    [locations, dressingMap],
  );

  const filteredRows = useMemo(() => {
    let result = rows;

    // Apply status filter
    if (filter === 'dressed') result = result.filter((r) => r.status === 'dressed');
    else if (filter === 'claimed') result = result.filter((r) => r.status === 'claimed');
    else if (filter === 'available') result = result.filter((r) => r.status === 'available');
    else if (filter === 'reported') result = result.filter((r) => (r.dressing?.reportCount ?? 0) > 0);

    // Apply search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((r) =>
        r.location.label.toLowerCase().includes(q) ||
        r.location.address.toLowerCase().includes(q) ||
        r.county.toLowerCase().includes(q)
      );
    }

    return result;
  }, [rows, filter, search]);

  const sortedRows = useMemo(() => {
    const statusOrder: Record<LocationStatus, number> = { available: 0, claimed: 1, dressed: 2 };

    return [...filteredRows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'location':
          cmp = a.location.label.localeCompare(b.location.label);
          break;
        case 'type':
          cmp = a.location.type.localeCompare(b.location.type);
          break;
        case 'county':
          cmp = a.county.localeCompare(b.county);
          break;
        case 'address':
          cmp = a.location.address.localeCompare(b.location.address);
          break;
        case 'status':
          cmp = statusOrder[a.status] - statusOrder[b.status];
          break;
        case 'volunteer':
          cmp = (a.dressing?.volunteerName || '').localeCompare(b.dressing?.volunteerName || '');
          break;
        case 'signs':
          cmp = (a.dressing?.signCount ?? 0) - (b.dressing?.signCount ?? 0);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredRows, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return <span className="sort-indicator"> ⇅</span>;
    return <span className="sort-indicator active">{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>;
  }

  async function handleRevert() {
    if (!revertTarget) return;
    try {
      await revertDressing(revertTarget.location.id);
    } catch {
      alert('Failed to revert dressing status.');
    } finally {
      setRevertTarget(null);
    }
  }

  async function handleUnclaim() {
    if (!unclaimTarget) return;
    try {
      await unclaimLocation(unclaimTarget.location.id);
    } catch {
      alert('Failed to unclaim location.');
    } finally {
      setUnclaimTarget(null);
    }
  }

  async function handleDismissReports() {
    if (!dismissTarget) return;
    try {
      await dismissReports(dismissTarget.location.id);
    } catch {
      alert('Failed to dismiss reports.');
    } finally {
      setDismissTarget(null);
    }
  }

  const typeLabel = (type: string) =>
    MARKER_TYPES[type as keyof typeof MARKER_TYPES]?.label ?? type;

  const dressedCount = rows.filter((r) => r.status === 'dressed').length;
  const claimedCount = rows.filter((r) => r.status === 'claimed').length;
  const availableCount = rows.filter((r) => r.status === 'available').length;
  const reportedCount = rows.filter((r) => (r.dressing?.reportCount ?? 0) > 0).length;

  return (
    <>
      <div className="table-toolbar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({rows.length})
          </button>
          <button
            className={`filter-tab ${filter === 'available' ? 'active' : ''}`}
            onClick={() => setFilter('available')}
          >
            Available ({availableCount})
          </button>
          <button
            className={`filter-tab ${filter === 'claimed' ? 'active' : ''}`}
            onClick={() => setFilter('claimed')}
          >
            Claimed ({claimedCount})
          </button>
          <button
            className={`filter-tab ${filter === 'dressed' ? 'active' : ''}`}
            onClick={() => setFilter('dressed')}
          >
            Dressed ({dressedCount})
          </button>
          {reportedCount > 0 && (
            <button
              className={`filter-tab filter-tab-warning ${filter === 'reported' ? 'active' : ''}`}
              onClick={() => setFilter('reported')}
            >
              Reported ({reportedCount})
            </button>
          )}
        </div>
        <div className="table-search">
          <input
            type="text"
            placeholder="Search by name, address, or county..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          {search && (
            <span className="search-count">{sortedRows.length} result{sortedRows.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      <div className="table-wrapper">
        <table className="submissions-table sortable-table">
          <thead>
            <tr>
              <th className="sortable-th" onClick={() => handleSort('location')}>
                Location{sortIndicator('location')}
              </th>
              <th className="sortable-th" onClick={() => handleSort('type')}>
                Type{sortIndicator('type')}
              </th>
              <th className="sortable-th" onClick={() => handleSort('county')}>
                County{sortIndicator('county')}
              </th>
              <th className="sortable-th" onClick={() => handleSort('address')}>
                Address{sortIndicator('address')}
              </th>
              <th className="sortable-th" onClick={() => handleSort('status')}>
                Status{sortIndicator('status')}
              </th>
              <th className="sortable-th" onClick={() => handleSort('volunteer')}>
                Volunteer{sortIndicator('volunteer')}
              </th>
              <th>Contact</th>
              <th className="sortable-th" onClick={() => handleSort('signs')}>
                Signs{sortIndicator('signs')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const isExpanded = expandedRowId === row.location.id;
              return (
                <React.Fragment key={row.location.id}>
                  <tr>
                    <td>{row.location.label}</td>
                    <td>{typeLabel(row.location.type)}</td>
                    <td>{row.county}</td>
                    <td className="address-cell">{row.location.address}</td>
                    <td>
                      <span className={`status-badge status-${row.status}`}>
                        {row.status === 'dressed' ? 'Dressed' : row.status === 'claimed' ? 'Claimed' : 'Available'}
                      </span>
                      {(row.dressing?.reportCount ?? 0) > 0 && (
                        <span className="report-indicator" title={row.dressing?.lastReportReason ?? ''}>
                          {row.dressing!.reportCount}
                        </span>
                      )}
                      {filter === 'reported' && row.dressing?.lastReportReason && (
                        <div className="report-reason-text">
                          {row.dressing.lastReportReason}
                        </div>
                      )}
                    </td>
                    <td>{row.dressing?.volunteerName || '—'}</td>
                    <td className="contact-cell">
                      {row.dressing?.volunteerPhone && <div>{row.dressing.volunteerPhone}</div>}
                      {row.dressing?.volunteerEmail && <div className="email-text">{row.dressing.volunteerEmail}</div>}
                    </td>
                    <td>
                      {row.status === 'dressed' && row.dressing?.signCount ? row.dressing.signCount : '—'}
                    </td>
                    <td className="actions-cell">
                      <button
                        className={`btn btn-sm ${isExpanded ? 'btn-secondary' : 'btn-outline'}`}
                        onClick={() => setExpandedRowId(isExpanded ? null : row.location.id)}
                        title="Show nearby unclaimed locations"
                      >
                        Nearby
                      </button>
                      {row.status === 'dressed' && (
                        <>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => setEditTarget(row)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => setRevertTarget(row)}
                          >
                            Revert
                          </button>
                          {(row.dressing?.reportCount ?? 0) > 0 && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => setDismissTarget(row)}
                            >
                              Dismiss
                            </button>
                          )}
                        </>
                      )}
                      {row.status === 'claimed' && (
                        <>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => setDressTarget(row)}
                          >
                            Mark Dressed
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => setUnclaimTarget(row)}
                          >
                            Unclaim
                          </button>
                        </>
                      )}
                      {row.status === 'available' && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => setDressTarget(row)}
                        >
                          Mark Dressed
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="expanded-row">
                      <td colSpan={9} className="expanded-row-detail">
                        <NearbyPanel
                          location={row.location}
                          claimedOrDressedIds={claimedOrDressedIds}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {revertTarget && (
        <ConfirmDialog
          message={`Revert "${revertTarget.location.label}" to claimed?`}
          confirmLabel="Revert"
          onConfirm={handleRevert}
          onCancel={() => setRevertTarget(null)}
        />
      )}

      {unclaimTarget && (
        <ConfirmDialog
          message={`Unclaim "${unclaimTarget.location.label}"? This will remove the volunteer assignment.`}
          confirmLabel="Unclaim"
          onConfirm={handleUnclaim}
          onCancel={() => setUnclaimTarget(null)}
        />
      )}

      {editTarget && editTarget.dressing && (
        <DressingEditModal
          locationLabel={editTarget.location.label}
          dressing={editTarget.dressing}
          onClose={() => setEditTarget(null)}
          onSaved={() => setEditTarget(null)}
        />
      )}

      {dressTarget && (
        <AdminDressModal
          marker={dressTarget.location}
          dressing={dressTarget.dressing}
          onClose={() => setDressTarget(null)}
          onDressed={() => setDressTarget(null)}
        />
      )}

      {dismissTarget && (
        <ConfirmDialog
          message={`Dismiss ${dismissTarget.dressing?.reportCount} report(s) for "${dismissTarget.location.label}"?${dismissTarget.dressing?.lastReportReason ? `\n\nLast report: ${dismissTarget.dressing.lastReportReason}` : ''}`}
          confirmLabel="Dismiss Reports"
          onConfirm={handleDismissReports}
          onCancel={() => setDismissTarget(null)}
        />
      )}
    </>
  );
}
