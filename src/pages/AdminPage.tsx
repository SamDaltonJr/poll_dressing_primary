import { useState } from 'react';
import AdminLogin from '../components/admin/AdminLogin';
import DressingTable from '../components/admin/DressingTable';
import StatsPanel from '../components/admin/StatsPanel';
import ExportButton from '../components/admin/ExportButton';
import DistributionPointTable from '../components/admin/DistributionPointTable';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useDressings } from '../hooks/useDressings';
import { useDistributionPoints } from '../hooks/useDistributionPoints';

type AdminTab = 'polling' | 'distribution';

export default function AdminPage() {
  const { dressings, loading } = useDressings();
  const { points: distributionPoints, loading: dpLoading } = useDistributionPoints();
  const [activeTab, setActiveTab] = useState<AdminTab>('polling');

  return (
    <AdminLogin>
      <div className="admin-page">
        <div className="admin-header">
          <h2>Admin Dashboard</h2>
          <ExportButton dressings={dressings} />
        </div>
        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'polling' ? 'active' : ''}`}
            onClick={() => setActiveTab('polling')}
          >
            Polling Locations
          </button>
          <button
            className={`admin-tab ${activeTab === 'distribution' ? 'active' : ''}`}
            onClick={() => setActiveTab('distribution')}
          >
            Distribution Points ({distributionPoints.length})
          </button>
        </div>
        {activeTab === 'polling' && (
          loading ? (
            <LoadingSpinner message="Loading dressing data..." />
          ) : (
            <>
              <StatsPanel dressings={dressings} />
              <DressingTable dressings={dressings} />
            </>
          )
        )}
        {activeTab === 'distribution' && (
          dpLoading ? (
            <LoadingSpinner message="Loading distribution points..." />
          ) : (
            <DistributionPointTable points={distributionPoints} />
          )
        )}
      </div>
    </AdminLogin>
  );
}
