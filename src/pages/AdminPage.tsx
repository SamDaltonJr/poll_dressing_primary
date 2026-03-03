import { useState } from 'react';
import AdminLogin from '../components/admin/AdminLogin';
import DressingTable from '../components/admin/DressingTable';
import StatsPanel from '../components/admin/StatsPanel';
import CountyStatsPanel from '../components/admin/CountyStatsPanel';
import ExportButton from '../components/admin/ExportButton';
import DistributionPointTable from '../components/admin/DistributionPointTable';
import LocationReportTable from '../components/admin/LocationReportTable';
import SignSubmissionTable from '../components/admin/SignSubmissionTable';
import SignStatsPanel from '../components/admin/SignStatsPanel';
import SignExportButton from '../components/admin/SignExportButton';
import LocationReportExportButton from '../components/admin/LocationReportExportButton';
import PendingRemindersTable from '../components/admin/PendingRemindersTable';
import VolunteerLocationCounts from '../components/admin/VolunteerLocationCounts';
import PlannedSignTable from '../components/admin/PlannedSignTable';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { activeLocations } from '../config/categorizeLocations';
import { useDressings } from '../hooks/useDressings';
import { useDistributionPoints } from '../hooks/useDistributionPoints';
import { useLocationReports } from '../hooks/useLocationReports';
import { useSubmissions } from '../hooks/useSubmissions';
import { usePlannedSigns } from '../hooks/usePlannedSigns';
import { useSignPickups } from '../hooks/useSignPickups';

type AdminTab = 'polling' | 'distribution' | 'locationReports' | 'signs' | 'reminders' | 'volunteers' | 'plannedSigns' | 'stats';

export default function AdminPage() {
  const { dressings, loading } = useDressings();
  const { points: distributionPoints, loading: dpLoading } = useDistributionPoints();
  const { reports: locationReports, loading: lrLoading } = useLocationReports();
  const { submissions: signSubmissions, loading: subsLoading } = useSubmissions();
  const { signs: plannedSigns, loading: psLoading } = usePlannedSigns();
  const { pickups: signPickups, loading: pickupsLoading } = useSignPickups();
  const [activeTab, setActiveTab] = useState<AdminTab>('polling');
  const pendingReportCount = locationReports.filter((r) => r.status === 'pending').length;
  const activeLocationIds = new Set(activeLocations.map((l) => l.id));
  const pendingReminderCount = dressings.filter((d) => activeLocationIds.has(d.locationId) && d.isClaimed && !d.isDressed && d.volunteerEmail).length;
  const volunteerCount = new Set(dressings.filter((d) => activeLocationIds.has(d.locationId) && d.isClaimed && d.volunteerName).map((d) => d.volunteerEmail || d.volunteerPhone || d.volunteerName)).size;

  return (
    <AdminLogin>
      <div className="admin-page">
        <div className="admin-header">
          <h2>Admin Dashboard</h2>
          {activeTab === 'signs' ? (
            <SignExportButton submissions={signSubmissions} />
          ) : activeTab === 'locationReports' ? (
            <LocationReportExportButton reports={locationReports} />
          ) : (
            <ExportButton dressings={dressings} />
          )}
        </div>
        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'polling' ? 'active' : ''}`}
            onClick={() => setActiveTab('polling')}
          >
            Polling Locations
          </button>
          <button
            className={`admin-tab ${activeTab === 'signs' ? 'active' : ''}`}
            onClick={() => setActiveTab('signs')}
          >
            Sign Placements ({signSubmissions.length})
          </button>
          <button
            className={`admin-tab ${activeTab === 'plannedSigns' ? 'active' : ''}`}
            onClick={() => setActiveTab('plannedSigns')}
          >
            Planned Signs ({plannedSigns.length})
          </button>
          <button
            className={`admin-tab ${activeTab === 'distribution' ? 'active' : ''}`}
            onClick={() => setActiveTab('distribution')}
          >
            Distribution Points ({distributionPoints.length})
          </button>
          <button
            className={`admin-tab ${activeTab === 'locationReports' ? 'active' : ''}`}
            onClick={() => setActiveTab('locationReports')}
          >
            Location Reports{pendingReportCount > 0 ? ` (${pendingReportCount})` : ''}
          </button>
          <button
            className={`admin-tab ${activeTab === 'reminders' ? 'active' : ''}`}
            onClick={() => setActiveTab('reminders')}
          >
            Reminders{pendingReminderCount > 0 ? ` (${pendingReminderCount})` : ''}
          </button>
          <button
            className={`admin-tab ${activeTab === 'volunteers' ? 'active' : ''}`}
            onClick={() => setActiveTab('volunteers')}
          >
            Volunteers{volunteerCount > 0 ? ` (${volunteerCount})` : ''}
          </button>
          <button
            className={`admin-tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            Stats
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
        {activeTab === 'signs' && (
          subsLoading ? (
            <LoadingSpinner message="Loading sign submissions..." />
          ) : (
            <>
              <SignStatsPanel submissions={signSubmissions} />
              <SignSubmissionTable submissions={signSubmissions} />
            </>
          )
        )}
        {activeTab === 'plannedSigns' && (
          psLoading ? (
            <LoadingSpinner message="Loading planned signs..." />
          ) : (
            <PlannedSignTable signs={plannedSigns} />
          )
        )}
        {activeTab === 'distribution' && (
          dpLoading ? (
            <LoadingSpinner message="Loading distribution points..." />
          ) : (
            <DistributionPointTable points={distributionPoints} />
          )
        )}
        {activeTab === 'locationReports' && (
          lrLoading ? (
            <LoadingSpinner message="Loading location reports..." />
          ) : (
            <LocationReportTable reports={locationReports} />
          )
        )}
        {activeTab === 'reminders' && (
          loading ? (
            <LoadingSpinner message="Loading dressing data..." />
          ) : (
            <PendingRemindersTable dressings={dressings} />
          )
        )}
        {activeTab === 'volunteers' && (
          loading || pickupsLoading ? (
            <LoadingSpinner message="Loading volunteer data..." />
          ) : (
            <VolunteerLocationCounts dressings={dressings} pickups={signPickups} />
          )
        )}
        {activeTab === 'stats' && (
          loading ? (
            <LoadingSpinner message="Loading stats..." />
          ) : (
            <CountyStatsPanel dressings={dressings} />
          )
        )}
      </div>
    </AdminLogin>
  );
}
