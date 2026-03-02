import { useState, useMemo } from 'react';
import { activeLocations } from '../../config/categorizeLocations';
import { buildMassEmailMailtos } from '../../utils/mailto';
import { setSignPickup, removeSignPickup, updateSignPickupCount } from '../../services/signPickupService';
import type { DressingRecord, SignPickup } from '../../types';

interface VolunteerLocationCountsProps {
  dressings: DressingRecord[];
  pickups: SignPickup[];
}

interface VolunteerSummary {
  name: string;
  email: string;
  phone: string;
  totalLocations: number;
  dressed: number;
  pending: number;
}

export default function VolunteerLocationCounts({ dressings, pickups }: VolunteerLocationCountsProps) {
  const locationMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const loc of activeLocations) m.set(loc.id, loc.label);
    return m;
  }, []);

  // Build a lookup map from pickups: email → SignPickup
  const pickupMap = useMemo(() => {
    const m = new Map<string, SignPickup>();
    for (const p of pickups) m.set(p.volunteerEmail, p);
    return m;
  }, [pickups]);

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
    return [...groups.values()];
  }, [dressings, locationMap]);

  // Sort: only move to bottom once a sign count is entered, then by location count
  const sortedVolunteers = useMemo(
    () => [...volunteers].sort((a, b) => {
      const aComplete = (pickupMap.get(a.email)?.signCount ?? 0) > 0 ? 1 : 0;
      const bComplete = (pickupMap.get(b.email)?.signCount ?? 0) > 0 ? 1 : 0;
      if (aComplete !== bComplete) return aComplete - bComplete;
      return b.totalLocations - a.totalLocations;
    }),
    [volunteers, pickupMap],
  );

  const pickedUpCount = useMemo(
    () => volunteers.filter((v) => pickupMap.has(v.email)).length,
    [volunteers, pickupMap],
  );

  const [copiedAll, setCopiedAll] = useState(false);

  const volunteerEmails = useMemo(
    () => volunteers.filter((v) => v.email).map((v) => v.email),
    [volunteers],
  );

  const appUrl = window.location.origin + window.location.pathname;

  async function handleCopyEmails() {
    await navigator.clipboard.writeText(volunteerEmails.join(', '));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  function handleEmailAll() {
    const urls = buildMassEmailMailtos(volunteerEmails, appUrl);
    for (const url of urls) {
      window.open(url);
    }
  }

  async function handleTogglePickedUp(email: string) {
    if (!email) return;
    try {
      if (pickupMap.has(email)) {
        await removeSignPickup(email);
      } else {
        await setSignPickup(email, 0);
      }
    } catch {
      alert('Failed to update pickup status.');
    }
  }

  async function handleSignCountChange(email: string, value: string) {
    if (!email || !pickupMap.has(email)) return;
    const count = Math.max(0, parseInt(value, 10) || 0);
    try {
      await updateSignPickupCount(email, count);
    } catch {
      alert('Failed to update sign count.');
    }
  }

  if (volunteers.length === 0) {
    return null;
  }

  return (
    <div className="volunteer-counts-section">
      <div className="reminder-toolbar">
        <span className="reminder-summary">
          {volunteers.length} volunteer{volunteers.length !== 1 ? 's' : ''} assigned to locations{pickedUpCount > 0 && ` \u00b7 ${pickedUpCount} picked up signs`}
        </span>
        <div className="reminder-actions">
          <button className="btn btn-sm btn-secondary" onClick={handleCopyEmails}>
            {copiedAll ? 'Copied!' : 'Copy Emails'}
          </button>
          <button className="btn btn-sm btn-primary" onClick={handleEmailAll}>
            Email All{volunteerEmails.length > 50 ? ` (${Math.ceil(volunteerEmails.length / 50)} batches)` : ''}
          </button>
        </div>
      </div>
      <div className="table-wrapper">
        <table className="submissions-table">
          <thead>
            <tr>
              <th className="pickup-col">Picked Up</th>
              <th className="sign-count-col"># Signs</th>
              <th>Volunteer</th>
              <th>Email</th>
              <th>Phone</th>
              <th style={{ textAlign: 'center' }}>Locations</th>
              <th style={{ textAlign: 'center' }}>Pending</th>
              <th style={{ textAlign: 'center' }}>Dressed</th>
            </tr>
          </thead>
          <tbody>
            {sortedVolunteers.map((v) => {
              const pickup = pickupMap.get(v.email);
              return (
                <tr key={v.email || v.phone || v.name} className={pickup ? 'picked-up-row' : ''}>
                  <td className="pickup-col">
                    {v.email ? (
                      <input
                        type="checkbox"
                        className="pickup-checkbox"
                        checked={!!pickup}
                        onChange={() => handleTogglePickedUp(v.email)}
                      />
                    ) : (
                      <span title="No email — cannot track pickup">—</span>
                    )}
                  </td>
                  <td className="sign-count-col">
                    <input
                      type="number"
                      className="sign-count-input"
                      min="0"
                      value={pickup ? pickup.signCount || '' : ''}
                      onChange={(e) => handleSignCountChange(v.email, e.target.value)}
                      placeholder="0"
                      disabled={!pickup}
                    />
                  </td>
                  <td>{v.name}</td>
                  <td className="email-text">{v.email || '—'}</td>
                  <td>{v.phone || '—'}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{v.totalLocations}</td>
                  <td style={{ textAlign: 'center' }}>{v.pending > 0 ? v.pending : '—'}</td>
                  <td style={{ textAlign: 'center' }}>{v.dressed > 0 ? v.dressed : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
