import { useState } from 'react';
import { deletePlannedSign, updatePlannedSignStatus } from '../../services/plannedSignService';
import PlannedSignModal from './PlannedSignModal';
import ConfirmDialog from '../common/ConfirmDialog';
import type { PlannedSignLocation } from '../../types';

interface PlannedSignTableProps {
  signs: PlannedSignLocation[];
}

export default function PlannedSignTable({ signs }: PlannedSignTableProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<PlannedSignLocation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlannedSignLocation | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deletePlannedSign(deleteTarget.id);
    } catch {
      alert('Failed to delete planned sign location.');
    } finally {
      setDeleteTarget(null);
    }
  }

  async function handleToggleStatus(sign: PlannedSignLocation) {
    const newStatus = sign.status === 'planned' ? 'placed' : 'planned';
    try {
      await updatePlannedSignStatus(sign.id, newStatus);
    } catch {
      alert('Failed to update status.');
    }
  }

  const plannedCount = signs.filter((s) => s.status === 'planned').length;
  const placedCount = signs.filter((s) => s.status === 'placed').length;

  return (
    <>
      <div className="distribution-header">
        <div className="distribution-summary">
          <span className="distribution-summary-count">{signs.length}</span> planned locations
          <span className="distribution-summary-sep">&middot;</span>
          <span className="distribution-summary-count">{plannedCount}</span> planned
          <span className="distribution-summary-sep">&middot;</span>
          <span className="distribution-summary-count">{placedCount}</span> placed
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          + Add Planned Location
        </button>
      </div>

      {signs.length === 0 ? (
        <div className="empty-state">
          <p>No planned sign locations yet. Add one from here or use the map's pin drop feature.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="submissions-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Address</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {signs.map((sign) => (
                <tr key={sign.id}>
                  <td>{sign.name}</td>
                  <td className="address-cell">{sign.address}</td>
                  <td>
                    <button
                      className={`btn btn-sm ${sign.status === 'placed' ? 'btn-success' : 'btn-warning'}`}
                      onClick={() => handleToggleStatus(sign)}
                      title="Click to toggle status"
                    >
                      {sign.status === 'placed' ? 'Placed' : 'Planned'}
                    </button>
                  </td>
                  <td className="notes-cell">{sign.notes || '—'}</td>
                  <td className="actions-cell">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setEditTarget(sign)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => setDeleteTarget(sign)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <PlannedSignModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => setShowAddModal(false)}
        />
      )}

      {editTarget && (
        <PlannedSignModal
          sign={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => setEditTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete planned sign location "${deleteTarget.name}"?`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
