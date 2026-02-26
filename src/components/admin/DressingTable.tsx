import { useState, useMemo } from 'react';
import { revertDressing, unclaimLocation } from '../../services/dressingService';
import ConfirmDialog from '../common/ConfirmDialog';
import DressingEditModal from './DressingEditModal';
import AdminDressModal from './AdminDressModal';
import { allLocations } from '../../config/categorizeLocations';
import { MARKER_TYPES } from '../../config/constants';
import type { DressingRecord, MapMarker, LocationStatus } from '../../types';

type FilterMode = 'all' | 'available' | 'claimed' | 'dressed';

interface DressingTableProps {
  dressings: DressingRecord[];
}

interface Row {
  location: MapMarker;
  dressing?: DressingRecord;
  status: LocationStatus;
}

export default function DressingTable({ dressings }: DressingTableProps) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [revertTarget, setRevertTarget] = useState<Row | null>(null);
  const [unclaimTarget, setUnclaimTarget] = useState<Row | null>(null);
  const [editTarget, setEditTarget] = useState<Row | null>(null);
  const [dressTarget, setDressTarget] = useState<Row | null>(null);

  const dressingMap = useMemo(() => {
    const m = new Map<string, DressingRecord>();
    for (const d of dressings) m.set(d.locationId, d);
    return m;
  }, [dressings]);

  const locations = useMemo(() => allLocations, []);

  const rows = useMemo<Row[]>(() =>
    locations.map((loc) => {
      const d = dressingMap.get(loc.id);
      let status: LocationStatus = 'available';
      if (d?.isDressed) status = 'dressed';
      else if (d?.isClaimed) status = 'claimed';
      return { location: loc, dressing: d, status };
    }),
    [locations, dressingMap],
  );

  const filteredRows = useMemo(
    () => rows.filter((r) => {
      if (filter === 'dressed') return r.status === 'dressed';
      if (filter === 'claimed') return r.status === 'claimed';
      if (filter === 'available') return r.status === 'available';
      return true;
    }),
    [rows, filter],
  );

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

  const typeLabel = (type: string) =>
    MARKER_TYPES[type as keyof typeof MARKER_TYPES]?.label ?? type;

  const dressedCount = rows.filter((r) => r.status === 'dressed').length;
  const claimedCount = rows.filter((r) => r.status === 'claimed').length;
  const availableCount = rows.filter((r) => r.status === 'available').length;

  return (
    <>
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
      </div>

      <div className="table-wrapper">
        <table className="submissions-table">
          <thead>
            <tr>
              <th>Location</th>
              <th>Type</th>
              <th>Address</th>
              <th>Status</th>
              <th>Volunteer</th>
              <th>Contact</th>
              <th>Signs</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.location.id}>
                <td>{row.location.label}</td>
                <td>{typeLabel(row.location.type)}</td>
                <td className="address-cell">{row.location.address}</td>
                <td>
                  <span className={`status-badge status-${row.status}`}>
                    {row.status === 'dressed' ? 'Dressed' : row.status === 'claimed' ? 'Claimed' : 'Available'}
                  </span>
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
            ))}
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
    </>
  );
}
