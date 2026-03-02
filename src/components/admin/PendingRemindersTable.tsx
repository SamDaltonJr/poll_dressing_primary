import { useState, useMemo } from 'react';
import { activeLocations } from '../../config/categorizeLocations';
import { buildReminderMailto, buildBulkReminderMailtos } from '../../utils/mailto';
import { setSignPickup, removeSignPickup, updateSignPickupCount } from '../../services/signPickupService';
import type { DressingRecord, MapMarker, SignPickup } from '../../types';

interface PendingRemindersTableProps {
  dressings: DressingRecord[];
  pickups: SignPickup[];
}

interface VolunteerGroup {
  email: string;
  name: string;
  locations: { location: MapMarker; dressing: DressingRecord }[];
}

function getLastReminded(email: string): string | null {
  return localStorage.getItem(`reminder-vol-${email}`);
}

function setLastReminded(email: string): void {
  localStorage.setItem(`reminder-vol-${email}`, new Date().toISOString());
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function PendingRemindersTable({ dressings, pickups }: PendingRemindersTableProps) {
  const [reminderTimestamps, setReminderTimestamps] = useState<Record<string, string>>({});
  const [copiedAll, setCopiedAll] = useState(false);

  const locationMap = useMemo(() => {
    const m = new Map<string, MapMarker>();
    for (const loc of activeLocations) m.set(loc.id, loc);
    return m;
  }, []);

  // Build a lookup map from pickups: email → SignPickup
  const pickupMap = useMemo(() => {
    const m = new Map<string, SignPickup>();
    for (const p of pickups) m.set(p.volunteerEmail, p);
    return m;
  }, [pickups]);

  const volunteerGroups = useMemo<VolunteerGroup[]>(() => {
    const groups = new Map<string, VolunteerGroup>();
    for (const d of dressings) {
      if (!d.isClaimed || d.isDressed || !d.volunteerEmail) continue;
      const loc = locationMap.get(d.locationId);
      if (!loc) continue;
      const existing = groups.get(d.volunteerEmail);
      if (existing) {
        existing.locations.push({ location: loc, dressing: d });
      } else {
        groups.set(d.volunteerEmail, {
          email: d.volunteerEmail,
          name: d.volunteerName,
          locations: [{ location: loc, dressing: d }],
        });
      }
    }
    return [...groups.values()];
  }, [dressings, locationMap]);

  const sortedGroups = useMemo(
    () => [...volunteerGroups].sort((a, b) => {
      const aPickedUp = pickupMap.has(a.email) ? 1 : 0;
      const bPickedUp = pickupMap.has(b.email) ? 1 : 0;
      return aPickedUp - bPickedUp;
    }),
    [volunteerGroups, pickupMap],
  );

  const pickedUpCount = useMemo(
    () => volunteerGroups.filter((g) => pickupMap.has(g.email)).length,
    [volunteerGroups, pickupMap],
  );

  const totalLocations = useMemo(
    () => volunteerGroups.reduce((sum, g) => sum + g.locations.length, 0),
    [volunteerGroups],
  );

  const appUrl = window.location.origin + window.location.pathname;

  async function handleTogglePickedUp(email: string) {
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
    const count = Math.max(0, parseInt(value, 10) || 0);
    try {
      await updateSignPickupCount(email, count);
    } catch {
      alert('Failed to update sign count.');
    }
  }

  function handleSendReminder(group: VolunteerGroup) {
    const url = buildReminderMailto(
      group.email,
      group.locations.map((l) => ({ name: l.location.label, address: l.location.address })),
      appUrl,
    );
    setLastReminded(group.email);
    setReminderTimestamps((prev) => ({ ...prev, [group.email]: new Date().toISOString() }));
    window.open(url);
  }

  function handleRemindAll() {
    const emails = volunteerGroups.map((g) => g.email);
    const urls = buildBulkReminderMailtos(emails, appUrl);
    for (const group of volunteerGroups) {
      setLastReminded(group.email);
    }
    setReminderTimestamps((prev) => {
      const next = { ...prev };
      const now = new Date().toISOString();
      for (const group of volunteerGroups) next[group.email] = now;
      return next;
    });
    for (const url of urls) {
      window.open(url);
    }
  }

  async function handleCopyEmails() {
    const emails = volunteerGroups.map((g) => g.email);
    await navigator.clipboard.writeText(emails.join(', '));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  function getLastRemindedDisplay(email: string): string {
    const fromState = reminderTimestamps[email];
    const fromStorage = getLastReminded(email);
    const iso = fromState || fromStorage;
    return iso ? formatDate(iso) : '—';
  }

  if (volunteerGroups.length === 0) {
    return (
      <div className="empty-state">
        <p>No pending claims to remind. All claimed locations have been dressed, or no volunteers have provided email addresses.</p>
      </div>
    );
  }

  return (
    <>
      <div className="reminder-toolbar">
        <span className="reminder-summary">
          {volunteerGroups.length} volunteer{volunteerGroups.length !== 1 ? 's' : ''} with pending claims ({totalLocations} location{totalLocations !== 1 ? 's' : ''} total){pickedUpCount > 0 && ` · ${pickedUpCount} picked up`}
        </span>
        <div className="reminder-actions">
          <button className="btn btn-sm btn-secondary" onClick={handleCopyEmails}>
            {copiedAll ? 'Copied!' : 'Copy Emails'}
          </button>
          <button className="btn btn-sm btn-primary" onClick={handleRemindAll}>
            Remind All{volunteerGroups.length > 50 ? ` (${Math.ceil(volunteerGroups.length / 50)} batches)` : ''}
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
              <th>Locations</th>
              <th>Last Reminded</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedGroups.map((group) => {
              const pickup = pickupMap.get(group.email);
              return (
                <tr key={group.email} className={pickup ? 'picked-up-row' : ''}>
                  <td className="pickup-col">
                    <input
                      type="checkbox"
                      className="pickup-checkbox"
                      checked={!!pickup}
                      onChange={() => handleTogglePickedUp(group.email)}
                    />
                  </td>
                  <td className="sign-count-col">
                    <input
                      type="number"
                      className="sign-count-input"
                      min="0"
                      value={pickup?.signCount || ''}
                      onChange={(e) => handleSignCountChange(group.email, e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td>{group.name}</td>
                  <td className="email-text">{group.email}</td>
                  <td>
                    <div className="volunteer-locations">
                      {group.locations.map((l) => (
                        <div key={l.location.id} className="volunteer-location-item">
                          {l.location.label}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="last-reminded">{getLastRemindedDisplay(group.email)}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleSendReminder(group)}
                    >
                      Send Reminder
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
