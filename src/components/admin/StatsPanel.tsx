import { dualSites, earlyVotingOnly, electionDayOnly } from '../../config/categorizeLocations';
import type { DressingRecord } from '../../types';

interface StatsPanelProps {
  dressings: DressingRecord[];
}

export default function StatsPanel({ dressings }: StatsPanelProps) {
  const dressedSet = new Set(
    dressings.filter((d) => d.isDressed).map((d) => d.locationId),
  );

  const dualTotal = dualSites.length;
  const dualDressed = dualSites.filter((l) => dressedSet.has(l.id)).length;
  const evOnlyTotal = earlyVotingOnly.length;
  const evOnlyDressed = earlyVotingOnly.filter((l) => dressedSet.has(l.id)).length;
  const edOnlyTotal = electionDayOnly.length;
  const edOnlyDressed = electionDayOnly.filter((l) => dressedSet.has(l.id)).length;
  const totalLocations = dualTotal + evOnlyTotal + edOnlyTotal;
  const totalDressed = dualDressed + evOnlyDressed + edOnlyDressed;
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
        <div className="stat-number">{dualDressed}/{dualTotal}</div>
        <div className="stat-label">EV + Election Day</div>
      </div>
      <div className="stat-card">
        <div className="stat-number">{evOnlyDressed}/{evOnlyTotal}</div>
        <div className="stat-label">Early Voting Only</div>
      </div>
      <div className="stat-card">
        <div className="stat-number">{edOnlyDressed}/{edOnlyTotal}</div>
        <div className="stat-label">Election Day Only</div>
      </div>
      <div className="stat-card">
        <div className="stat-number">{totalLocations - totalDressed}</div>
        <div className="stat-label">Still Needed</div>
      </div>
    </div>
  );
}
