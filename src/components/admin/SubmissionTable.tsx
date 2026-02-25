import { useState } from 'react';
import { deleteSubmission } from '../../services/submissionService';
import ConfirmDialog from '../common/ConfirmDialog';
import SubmissionEditModal from './SubmissionEditModal';
import type { SignSubmission } from '../../types';

interface SubmissionTableProps {
  submissions: SignSubmission[];
}

export default function SubmissionTable({ submissions }: SubmissionTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<SignSubmission | null>(null);
  const [editTarget, setEditTarget] = useState<SignSubmission | null>(null);
  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteSubmission(deleteTarget.id, deleteTarget.photoPath);
    } catch {
      alert('Failed to delete submission.');
    } finally {
      setDeleteTarget(null);
    }
  }

  if (submissions.length === 0) {
    return <p className="empty-state">No sign submissions yet.</p>;
  }

  return (
    <>
      <div className="table-wrapper">
        <table className="submissions-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Volunteer</th>
              <th>Address</th>
              <th>Notes</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((sub) => (
              <tr key={sub.id}>
                <td>
                  {sub.photoUrl && (
                    <img src={sub.photoUrl} alt="Sign" className="table-thumb" />
                  )}
                </td>
                <td>{sub.volunteerName}</td>
                <td className="address-cell">{sub.address}</td>
                <td>{sub.notes}</td>
                <td>{sub.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</td>
                <td className="actions-cell">
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => setEditTarget(sub)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => setDeleteTarget(sub)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete submission by ${deleteTarget.volunteerName} at ${deleteTarget.address}?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {editTarget && (
        <SubmissionEditModal
          submission={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => setEditTarget(null)}
        />
      )}
    </>
  );
}
