import { useMemo } from 'react';
import { activeLocations } from '../../config/categorizeLocations';
import type { DressingRecord } from '../../types';

interface VolunteerLocationCountsProps {
  dressings: DressingRecord[];
}

interface VolunteerSummary {
  name: string;
  email: string;
  phone: string;
  totalLocations: number;
  dressed: number;
  pending: number;
}

export default function VolunteerLocationCounts({ dressings }: VolunteerLocationCountsProps) {
  const locationMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const loc of activeLocations) m.set(loc.id, loc.label);
    return m;
  }, []);

  const volunteers = useMemo<VolunteerSummary[]>(() => {
    const groups = new Map<string, VolunteerSummary>();
    for (const d of dressings) {
      if (!d.isClaimed || !d.volunteerName) continue;
      // Skip if location no longer exists
      if (!locationMap.has(d.locationId)) continue;

      const key = d.volunteerEmail || d.volunteerPhone || d.volunteerName;
      const existing = groups.get(key);
      if (existing) {
        existing.totalLocations++;
        if (d.isDressed) existing.dressed++;
        else existing.pending++;
      } else {
        groups.set(key, {
          name: d.volunteerName,
          email: d.volunteerEmail,
          phone: d.volunteerPhone,
          totalLocations: 1,
          dressed: d.isDressed ? 1 : 0,
          pending: d.isDressed ? 0 : 1,
        });
      }
    }
    return [...groups.values()].sort((a, b) => b.totalLocations - a.totalLocations);
  }, [dressings, locationMap]);

  if (volunteers.length === 0) {
    return null;
  }

  return (
    <div className="volunteer-counts-section">
      <h3 className="volunteer-counts-heading">Volunteer Location Counts</h3>
      <p className="volunteer-counts-subtitle">
        {volunteers.length} volunteer{volunteers.length !== 1 ? 's' : ''} assigned to locations — use this to plan sign distribution
      </p>
      <div className="table-wrapper">
        <table className="submissions-table">
          <thead>
            <tr>
              <th>Volunteer</th>
              <th>Email</th>
              <th>Phone</th>
              <th style={{ textAlign: 'center' }}>Locations</th>
              <th style={{ textAlign: 'center' }}>Pending</th>
              <th style={{ textAlign: 'center' }}>Dressed</th>
            </tr>
          </thead>
          <tbody>
            {volunteers.map((v) => (
              <tr key={v.email || v.phone || v.name}>
                <td>{v.name}</td>
                <td className="email-text">{v.email || '—'}</td>
                <td>{v.phone || '—'}</td>
                <td style={{ textAlign: 'center', fontWeight: 600 }}>{v.totalLocations}</td>
                <td style={{ textAlign: 'center' }}>{v.pending > 0 ? v.pending : '—'}</td>
                <td style={{ textAlign: 'center' }}>{v.dressed > 0 ? v.dressed : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
