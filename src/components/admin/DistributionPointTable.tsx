import { useState } from 'react';
import { deleteDistributionPoint, updateSignCount } from '../../services/distributionPointService';
import DistributionPointModal from './DistributionPointModal';
import ConfirmDialog from '../common/ConfirmDialog';
import type { DistributionPoint } from '../../types';

interface DistributionPointTableProps {
  points: DistributionPoint[];
}

export default function DistributionPointTable({ points }: DistributionPointTableProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<DistributionPoint | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DistributionPoint | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteDistributionPoint(deleteTarget.id);
    } catch {
      alert('Failed to delete distribution point.');
    } finally {
      setDeleteTarget(null);
    }
  }

  async function handleSignCountChange(point: DistributionPoint, delta: number) {
    const newCount = Math.max(0, point.signCount + delta);
    try {
      await updateSignCount(point.id, newCount);
    } catch {
      alert('Failed to update sign count.');
    }
  }

  const totalSigns = points.reduce((sum, p) => sum + p.signCount, 0);

  return (
    <>
      <div className="distribution-header">
        <div className="distribution-summary">
          <span className="distribution-summary-count">{points.length}</span> distribution points
          <span className="distribution-summary-sep">&middot;</span>
          <span className="distribution-summary-count">{totalSigns}</span> total signs
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          + Add Distribution Point
        </button>
      </div>

      {points.length === 0 ? (
        <div className="empty-state">
          <p>No distribution points yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="submissions-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Address</th>
                <th>Signs</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.id}>
                  <td>{point.name}</td>
                  <td className="address-cell">{point.address}</td>
                  <td>
                    <div className="sign-count-adjust">
                      <button onClick={() => handleSignCountChange(point, -1)}>-</button>
                      <span>{point.signCount}</span>
                      <button onClick={() => handleSignCountChange(point, 1)}>+</button>
                    </div>
                  </td>
                  <td className="notes-cell">{point.notes || '—'}</td>
                  <td className="actions-cell">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setEditTarget(point)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => setDeleteTarget(point)}
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
        <DistributionPointModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => setShowAddModal(false)}
        />
      )}

      {editTarget && (
        <DistributionPointModal
          point={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => setEditTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete distribution point "${deleteTarget.name}"?`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
