import { useMemo, useState } from 'react';
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
import LocationImportPanel from '../components/admin/LocationImportPanel';
import CoordinatorsPanel from '../components/admin/CoordinatorsPanel';
import PriorityTable from '../components/admin/PriorityTable';
import TurnoutImportPanel from '../components/admin/TurnoutImportPanel';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useDressings } from '../hooks/useDressings';
import { useDistributionPoints } from '../hooks/useDistributionPoints';
import { useLocationReports } from '../hooks/useLocationReports';
import { useSubmissions } from '../hooks/useSubmissions';
import { usePlannedSigns } from '../hooks/usePlannedSigns';
import { useSignPickups } from '../hooks/useSignPickups';
import { useCountyResolver } from '../hooks/useCountyResolver';
import { useLocations } from '../contexts/LocationsContext';
import { useAdminAuth, inScope } from '../contexts/AdminContext';
import { useCampaign } from '../contexts/CampaignContext';

type AdminTab = 'polling' | 'priority' | 'import' | 'distribution' | 'locationReports' | 'signs' | 'reminders' | 'volunteers' | 'plannedSigns' | 'stats' | 'coordinators';

export default function AdminPage() {
  return (
    <AdminLogin>
      <AdminDashboard />
    </AdminLogin>
  );
}

function AdminDashboard() {
  const campaign = useCampaign();
  const { role, adminName, allowedCounties, logout } = useAdminAuth();
  const { activeLocations, loading: locationsLoading } = useLocations();
  const { dressings, loading } = useDressings();
  const { points: distributionPoints, loading: dpLoading } = useDistributionPoints();
  const { reports: locationReports, loading: lrLoading } = useLocationReports();
  const { submissions: signSubmissions, loading: subsLoading } = useSubmissions();
  const { signs: plannedSigns, loading: psLoading } = usePlannedSigns();
  const { pickups: signPickups, loading: pickupsLoading } = useSignPickups();
  const resolveCounty = useCountyResolver();
  const [activeTab, setActiveTab] = useState<AdminTab>('polling');
  // Optional narrowing within the admin's scope ('' = everything they can see).
  const [countyFocus, setCountyFocus] = useState('');
  const [importMode, setImportMode] = useState<'sites' | 'turnout'>('sites');

  // Effective county filter: the coordinator's assignment, further narrowed by
  // the focus dropdown. null = statewide, no filter.
  const scope = useMemo<Set<string> | null>(() => {
    if (countyFocus) return new Set([countyFocus]);
    return allowedCounties;
  }, [countyFocus, allowedCounties]);

  const locations = useMemo(
    () => activeLocations.filter((l) => inScope(scope, l.county)),
    [activeLocations, scope],
  );
  const locationIds = useMemo(() => new Set(locations.map((l) => l.id)), [locations]);
  const scopedDressings = useMemo(
    () => dressings.filter((d) => locationIds.has(d.locationId)),
    [dressings, locationIds],
  );
  const scopedSubmissions = useMemo(
    () => signSubmissions.filter((s) => inScope(scope, resolveCounty(s))),
    [signSubmissions, scope, resolveCounty],
  );
  const scopedPlanned = useMemo(
    () => plannedSigns.filter((s) => inScope(scope, resolveCounty(s))),
    [plannedSigns, scope, resolveCounty],
  );
  const scopedPoints = useMemo(
    () => distributionPoints.filter((p) => inScope(scope, resolveCounty(p))),
    [distributionPoints, scope, resolveCounty],
  );
  const scopedReports = useMemo(
    () => locationReports.filter((r) => inScope(scope, resolveCounty(r))),
    [locationReports, scope, resolveCounty],
  );

  // Focus dropdown options: the coordinator's counties, or (statewide) every
  // county that currently has polling locations imported.
  const focusOptions = useMemo(() => {
    if (allowedCounties) return [...allowedCounties].sort();
    return [...new Set(activeLocations.map((l) => l.county))].sort();
  }, [allowedCounties, activeLocations]);

  const pendingReportCount = scopedReports.filter((r) => r.status === 'pending').length;
  const pendingReminderCount = scopedDressings.filter((d) => d.isClaimed && !d.isDressed && d.volunteerEmail).length;
  const volunteerCount = new Set(scopedDressings.filter((d) => d.isClaimed && d.volunteerName).map((d) => d.volunteerEmail || d.volunteerPhone || d.volunteerName)).size;

  const tabs: Array<{ key: AdminTab; label: string; stateOnly?: boolean; bigSignsOnly?: boolean; priorityOnly?: boolean }> = [
    { key: 'polling', label: `Polling Locations (${locations.length})` },
    { key: 'priority', label: 'Priority Sites', priorityOnly: true },
    { key: 'import', label: 'Import Locations' },
    { key: 'signs', label: `Sign Placements (${scopedSubmissions.length})`, bigSignsOnly: true },
    { key: 'plannedSigns', label: `Planned Signs (${scopedPlanned.length})`, bigSignsOnly: true },
    { key: 'distribution', label: `Distribution Points (${scopedPoints.length})` },
    { key: 'locationReports', label: `Location Reports${pendingReportCount > 0 ? ` (${pendingReportCount})` : ''}` },
    { key: 'reminders', label: `Reminders${pendingReminderCount > 0 ? ` (${pendingReminderCount})` : ''}` },
    { key: 'volunteers', label: `Volunteers${volunteerCount > 0 ? ` (${volunteerCount})` : ''}` },
    { key: 'stats', label: 'Stats' },
    { key: 'coordinators', label: 'Coordinators', stateOnly: true },
  ];

  const dressingsLoading = loading || locationsLoading;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h2>Admin Dashboard</h2>
          <p className="admin-session">
            Signed in as <strong>{adminName}</strong>
            {allowedCounties && <> · {allowedCounties.size} {allowedCounties.size === 1 ? 'county' : 'counties'}</>}
            {' · '}
            <button type="button" className="link-button" onClick={logout}>Log out</button>
          </p>
        </div>
        <div className="admin-header-actions">
          {focusOptions.length > 1 && (
            <select
              className="admin-county-focus"
              value={countyFocus}
              onChange={(e) => setCountyFocus(e.target.value)}
              aria-label="Filter by county"
            >
              <option value="">{allowedCounties ? 'All my counties' : 'All counties'}</option>
              {focusOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {activeTab === 'signs' ? (
            <SignExportButton submissions={scopedSubmissions} />
          ) : activeTab === 'locationReports' ? (
            <LocationReportExportButton reports={scopedReports} />
          ) : (
            <ExportButton dressings={scopedDressings} locations={locations} />
          )}
        </div>
      </div>
      <div className="admin-tabs">
        {tabs.filter((t) => (!t.stateOnly || role === 'state') && (!t.bigSignsOnly || campaign.bigSigns) && (!t.priorityOnly || campaign.priority)).map((t) => (
          <button
            key={t.key}
            className={`admin-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {activeTab === 'polling' && (
        dressingsLoading ? (
          <LoadingSpinner message="Loading dressing data..." />
        ) : locations.length === 0 ? (
          <div className="admin-empty">
            <p>No polling locations imported{scope ? ' for these counties' : ''} yet.</p>
            <button className="btn btn-primary" onClick={() => setActiveTab('import')}>Import locations</button>
          </div>
        ) : (
          <>
            <StatsPanel dressings={scopedDressings} locations={locations} />
            <DressingTable dressings={scopedDressings} locations={locations} />
          </>
        )
      )}
      {activeTab === 'priority' && (
        dressingsLoading ? (
          <LoadingSpinner message="Loading priority sites..." />
        ) : (
          <PriorityTable dressings={scopedDressings} locations={locations} />
        )
      )}
      {activeTab === 'import' && (
        locationsLoading ? <LoadingSpinner message="Loading locations..." /> : (
          <>
            {campaign.priority && (
              <div className="filter-tabs import-mode-tabs">
                <button className={`filter-tab ${importMode === 'sites' ? 'active' : ''}`} onClick={() => setImportMode('sites')}>
                  Site lists
                </button>
                <button className={`filter-tab ${importMode === 'turnout' ? 'active' : ''}`} onClick={() => setImportMode('turnout')}>
                  Turnout numbers
                </button>
              </div>
            )}
            {importMode === 'turnout' && campaign.priority ? <TurnoutImportPanel /> : <LocationImportPanel />}
          </>
        )
      )}
      {activeTab === 'signs' && (
        subsLoading ? (
          <LoadingSpinner message="Loading sign submissions..." />
        ) : (
          <>
            <SignStatsPanel submissions={scopedSubmissions} />
            <SignSubmissionTable submissions={scopedSubmissions} />
          </>
        )
      )}
      {activeTab === 'plannedSigns' && (
        psLoading ? (
          <LoadingSpinner message="Loading planned signs..." />
        ) : (
          <PlannedSignTable signs={scopedPlanned} />
        )
      )}
      {activeTab === 'distribution' && (
        dpLoading ? (
          <LoadingSpinner message="Loading distribution points..." />
        ) : (
          <DistributionPointTable points={scopedPoints} />
        )
      )}
      {activeTab === 'locationReports' && (
        lrLoading ? (
          <LoadingSpinner message="Loading location reports..." />
        ) : (
          <LocationReportTable reports={scopedReports} />
        )
      )}
      {activeTab === 'reminders' && (
        dressingsLoading ? (
          <LoadingSpinner message="Loading dressing data..." />
        ) : (
          <PendingRemindersTable dressings={scopedDressings} locations={locations} />
        )
      )}
      {activeTab === 'volunteers' && (
        dressingsLoading || pickupsLoading ? (
          <LoadingSpinner message="Loading volunteer data..." />
        ) : (
          <VolunteerLocationCounts dressings={scopedDressings} pickups={signPickups} locations={locations} />
        )
      )}
      {activeTab === 'stats' && (
        dressingsLoading ? (
          <LoadingSpinner message="Loading stats..." />
        ) : (
          <CountyStatsPanel dressings={scopedDressings} locations={locations} />
        )
      )}
      {activeTab === 'coordinators' && role === 'state' && <CoordinatorsPanel />}
    </div>
  );
}
