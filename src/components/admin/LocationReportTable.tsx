import { useState, useMemo } from 'react';
import { resolveLocationReport, deleteLocationReport } from '../../services/locationReportService';
import ConfirmDialog from '../common/ConfirmDialog';
import type { LocationReport } from '../../types';

type FilterMode = 'all' | 'pending' | 'resolved';

interface LocationReportTableProps {
  reports: LocationReport[];
}

export default function LocationReportTable({ reports }: LocationReportTableProps) {
  const [filter, setFilter] = useState<FilterMode>('pending');
  const [resolveTarget, setResolveTarget] = useState<LocationReport | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LocationReport | null>(null);

  const filteredReports = useMemo(
    () => reports.filter((r) => {
      if (filter === 'pending') return r.status === 'pending';
      if (filter === 'resolved') return r.status === 'resolved';
      return true;
    }),
    [reports, filter],
  );

  const pendingCount = reports.filter((r) => r.status === 'pending').length;
  const resolvedCount = reports.filter((r) => r.status === 'resolved').length;

  async function handleResolve() {
    if (!resolveTarget) return;
    try {
      await resolveLocationReport(resolveTarget.id, 'Reviewed and resolved');
    } catch {
      alert('Failed to resolve report.');
    } finally {
      setResolveTarget(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteLocationReport(deleteTarget.id);
    } catch {
      alert('Failed to delete report.');
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <>
      <div className="filter-tabs">
        <button className={`filter-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          All ({reports.length})
        </button>
        <button className={`filter-tab ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>
          Pending ({pendingCount})
        </button>
        <button className={`filter-tab ${filter === 'resolved' ? 'active' : ''}`} onClick={() => setFilter('resolved')}>
          Resolved ({resolvedCount})
        </button>
      </div>

      {filteredReports.length === 0 ? (
        <div className="empty-state">
          <p>No {filter === 'all' ? '' : filter + ' '}location reports.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="submissions-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Location</th>
                <th>Address</th>
                <th>Reporter</th>
                <th>Notes</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr key={report.id}>
                  <td>
                    <span className={`status-badge category-${report.category}`}>
                      {report.category === 'missing' ? 'Missing' : 'Incorrect'}
                    </span>
                  </td>
                  <td>{report.locationName}</td>
                  <td className="address-cell">{report.address}</td>
                  <td>
                    {report.reporterName || '\u2014'}
                    {report.reporterContact && (
                      <div className="email-text">{report.reporterContact}</div>
                    )}
                  </td>
                  <td className="notes-cell">{report.notes || '\u2014'}</td>
                  <td>
                    <span className={`status-badge status-${report.status}`}>
                      {report.status === 'pending' ? 'Pending' : 'Resolved'}
                    </span>
                  </td>
                  <td>{report.createdAt?.toDate?.().toLocaleDateString() ?? '\u2014'}</td>
                  <td className="actions-cell">
                    {report.status === 'pending' && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => setResolveTarget(report)}
                      >
                        Resolve
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => setDeleteTarget(report)}
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

      {resolveTarget && (
        <ConfirmDialog
          message={`Mark "${resolveTarget.locationName}" report as resolved?`}
          confirmLabel="Resolve"
          onConfirm={handleResolve}
          onCancel={() => setResolveTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete report for "${deleteTarget.locationName}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
