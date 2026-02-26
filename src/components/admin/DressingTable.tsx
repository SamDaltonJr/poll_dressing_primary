import { useState, useMemo } from 'react';
import { revertDressing } from '../../services/dressingService';
import ConfirmDialog from '../common/ConfirmDialog';
import DressingEditModal from './DressingEditModal';
import AdminDressModal from './AdminDressModal';
import { allLocations } from '../../config/categorizeLocations';
import { MARKER_TYPES } from '../../config/constants';
import type { DressingRecord, MapMarker } from '../../types';

type FilterMode = 'all' | 'dressed' | 'undressed';

interface DressingTableProps {
  dressings: DressingRecord[];
}

interface Row {
  location: MapMarker;
  dressing?: DressingRecord;
  isDressed: boolean;
}

export default function DressingTable({ dressings }: DressingTableProps) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [revertTarget, setRevertTarget] = useState<Row | null>(null);
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
      return { location: loc, dressing: d, isDressed: d?.isDressed ?? false };
    }),
    [locations, dressingMap],
  );

  const filteredRows = useMemo(
    () => rows.filter((r) => {
      if (filter === 'dressed') return r.isDressed;
      if (filter === 'undressed') return !r.isDressed;
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

  const typeLabel = (type: string) =>
    MARKER_TYPES[type as keyof typeof MARKER_TYPES]?.label ?? type;

  const dressedCount = rows.filter((r) => r.isDressed).length;
  const undressedCount = rows.length - dressedCount;

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
          className={`filter-tab ${filter === 'dressed' ? 'active' : ''}`}
          onClick={() => setFilter('dressed')}
        >
          Dressed ({dressedCount})
        </button>
        <button
          className={`filter-tab ${filter === 'undressed' ? 'active' : ''}`}
          onClick={() => setFilter('undressed')}
        >
          Not Dressed ({undressedCount})
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
              <th>Dressed At</th>
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
                  <span className={`status-badge ${row.isDressed ? 'status-dressed' : 'status-undressed'}`}>
                    {row.isDressed ? 'Dressed' : 'Not Dressed'}
                  </span>
                </td>
                <td>{row.dressing?.volunteerName || '—'}</td>
                <td className="contact-cell">
                  {row.dressing?.volunteerPhone && <div>{row.dressing.volunteerPhone}</div>}
                  {row.dressing?.volunteerEmail && <div className="email-text">{row.dressing.volunteerEmail}</div>}
                </td>
                <td>
                  {row.dressing?.dressedAt?.toDate?.()?.toLocaleDateString() || '—'}
                </td>
                <td className="actions-cell">
                  {row.isDressed ? (
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
                  ) : (
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
          message={`Revert "${revertTarget.location.label}" to undressed?`}
          confirmLabel="Revert"
          onConfirm={handleRevert}
          onCancel={() => setRevertTarget(null)}
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
          onClose={() => setDressTarget(null)}
          onDressed={() => setDressTarget(null)}
        />
      )}
    </>
  );
}
