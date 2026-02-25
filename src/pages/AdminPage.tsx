import AdminLogin from '../components/admin/AdminLogin';
import SubmissionTable from '../components/admin/SubmissionTable';
import StatsPanel from '../components/admin/StatsPanel';
import ExportButton from '../components/admin/ExportButton';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useSubmissions } from '../hooks/useSubmissions';

export default function AdminPage() {
  const { submissions, loading } = useSubmissions();

  return (
    <AdminLogin>
      <div className="admin-page">
        <div className="admin-header">
          <h2>Admin Dashboard</h2>
          <ExportButton submissions={submissions} />
        </div>
        {loading ? (
          <LoadingSpinner message="Loading submissions..." />
        ) : (
          <>
            <StatsPanel submissions={submissions} />
            <SubmissionTable submissions={submissions} />
          </>
        )}
      </div>
    </AdminLogin>
  );
}
