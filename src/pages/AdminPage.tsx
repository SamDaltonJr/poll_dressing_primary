import AdminLogin from '../components/admin/AdminLogin';
import DressingTable from '../components/admin/DressingTable';
import StatsPanel from '../components/admin/StatsPanel';
import ExportButton from '../components/admin/ExportButton';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useDressings } from '../hooks/useDressings';

export default function AdminPage() {
  const { dressings, loading } = useDressings();

  return (
    <AdminLogin>
      <div className="admin-page">
        <div className="admin-header">
          <h2>Admin Dashboard</h2>
          <ExportButton dressings={dressings} />
        </div>
        {loading ? (
          <LoadingSpinner message="Loading dressing data..." />
        ) : (
          <>
            <StatsPanel dressings={dressings} />
            <DressingTable dressings={dressings} />
          </>
        )}
      </div>
    </AdminLogin>
  );
}
