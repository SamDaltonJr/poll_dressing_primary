import type { SignSubmission } from '../../types';

interface StatsPanelProps {
  submissions: SignSubmission[];
}

export default function SignStatsPanel({ submissions }: StatsPanelProps) {
  const total = submissions.length;

  // Group by city (extract from address — typically the city is the 2nd or 3rd comma-separated part)
  const byCityMap = new Map<string, number>();
  for (const sub of submissions) {
    const parts = sub.address.split(',').map((s) => s.trim());
    const city = parts[1] || parts[0] || 'Unknown';
    byCityMap.set(city, (byCityMap.get(city) || 0) + 1);
  }
  const byCity = Array.from(byCityMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const latest = submissions[0];

  return (
    <div className="stats-panel">
      <div className="stat-card">
        <div className="stat-number">{total}</div>
        <div className="stat-label">Total Signs</div>
      </div>
      <div className="stat-card">
        <div className="stat-number">{byCityMap.size}</div>
        <div className="stat-label">Areas Covered</div>
      </div>
      {latest && (
        <div className="stat-card">
          <div className="stat-detail">
            <strong>Latest:</strong> {latest.volunteerName}
          </div>
          <div className="stat-label">
            {latest.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
          </div>
        </div>
      )}
      {byCity.length > 0 && (
        <div className="stat-card stat-card-wide">
          <strong>Signs by Area</strong>
          <ul className="area-list">
            {byCity.map(([city, count]) => (
              <li key={city}>
                <span>{city}</span>
                <span className="area-count">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
