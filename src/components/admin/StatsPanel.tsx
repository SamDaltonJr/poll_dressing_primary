import type { DressingRecord, MapMarker } from '../../types';

interface StatsPanelProps {
  dressings: DressingRecord[];
  locations: MapMarker[];
}

export default function StatsPanel({ dressings, locations }: StatsPanelProps) {
  const dressedSet = new Set(
    dressings.filter((d) => d.isDressed).map((d) => d.locationId),
  );
  const claimedSet = new Set(
    dressings.filter((d) => d.isClaimed && !d.isDressed).map((d) => d.locationId),
  );
  const totalSigns = dressings
    .filter((d) => d.isDressed)
    .reduce((sum, d) => sum + (d.signCount || 0), 0);
  const reportedCount = dressings.filter((d) => (d.reportCount ?? 0) > 0).length;

  const byType = (type: MapMarker['type']) => {
    const locs = locations.filter((l) => l.type === type);
    return { total: locs.length, dressed: locs.filter((l) => dressedSet.has(l.id)).length };
  };
  const dual = byType('dualSite');
  const evOnly = byType('earlyVotingOnly');
  const edOnly = byType('electionDayOnly');
  const totalLocations = locations.length;
  const totalDressed = locations.filter((l) => dressedSet.has(l.id)).length;
  const totalClaimed = locations.filter((l) => claimedSet.has(l.id)).length;
  const pct = totalLocations > 0 ? Math.round((totalDressed / totalLocations) * 100) : 0;

  return (
    <div className="stats-panel">
      <div className="stat-card">
        <div className="stat-number">{totalDressed}/{totalLocations}</div>
        <div className="stat-label">Total Dressed ({pct}%)</div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-number">{totalClaimed}</div>
        <div className="stat-label">Claimed</div>
      </div>
      <div className="stat-card">
        <div className="stat-number">{totalSigns}</div>
        <div className="stat-label">Signs Placed</div>
      </div>
      <div className="stat-card">
        <div className="stat-number">{dual.dressed}/{dual.total}</div>
        <div className="stat-label">EV + Election Day</div>
      </div>
      {evOnly.total > 0 && (
        <div className="stat-card">
          <div className="stat-number">{evOnly.dressed}/{evOnly.total}</div>
          <div className="stat-label">Early Voting Only</div>
        </div>
      )}
      <div className="stat-card">
        <div className="stat-number">{edOnly.dressed}/{edOnly.total}</div>
        <div className="stat-label">Election Day Only</div>
      </div>
      {reportedCount > 0 && (
        <div className="stat-card stat-card-warning">
          <div className="stat-number stat-number-warning">{reportedCount}</div>
          <div className="stat-label">Reported</div>
        </div>
      )}
      <div className="stat-card">
        <div className="stat-number">{totalLocations - totalDressed - totalClaimed}</div>
        <div className="stat-label">Still Needed</div>
      </div>
    </div>
  );
}
