import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useCampaign } from '../../contexts/CampaignContext';
import { subscribeToCoordinators, createCoordinator, updateCoordinator, deleteCoordinator } from '../../services/coordinatorService';
import { TEXAS_COUNTY_NAMES } from '../../config/texasCounties';
import { TEXAS_REGIONS } from '../../config/texasRegions';
import ConfirmDialog from '../common/ConfirmDialog';
import LoadingSpinner from '../common/LoadingSpinner';
import type { Coordinator } from '../../types';

interface CountyPickerProps {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

/** Region quick-picks + filterable checkbox list of all 254 counties. */
function CountyPicker({ selected, onChange }: CountyPickerProps) {
  const [filter, setFilter] = useState('');
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? TEXAS_COUNTY_NAMES.filter((c) => c.toLowerCase().includes(q)) : TEXAS_COUNTY_NAMES;
  }, [filter]);

  function toggle(county: string) {
    const next = new Set(selected);
    if (next.has(county)) next.delete(county);
    else next.add(county);
    onChange(next);
  }

  function addRegion(counties: string[]) {
    onChange(new Set([...selected, ...counties]));
  }

  return (
    <div className="county-picker">
      <div className="county-picker-regions">
        {Object.entries(TEXAS_REGIONS).map(([region, counties]) => (
          <button key={region} type="button" className="btn btn-secondary btn-sm" onClick={() => addRegion(counties)}>
            + {region}
          </button>
        ))}
        {selected.size > 0 && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange(new Set())}>
            Clear
          </button>
        )}
      </div>
      {selected.size > 0 && (
        <div className="county-picker-selected">
          {[...selected].sort().map((c) => (
            <button key={c} type="button" className="county-chip" onClick={() => toggle(c)} title="Remove">
              {c} ×
            </button>
          ))}
        </div>
      )}
      <input
        type="text"
        className="county-picker-filter"
        placeholder="Filter counties…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="county-picker-list">
        {visible.map((c) => (
          <label key={c} className="county-picker-item">
            <input type="checkbox" checked={selected.has(c)} onChange={() => toggle(c)} />
            {c}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function CoordinatorsPanel() {
  const campaign = useCampaign();
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Coordinator | 'new' | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [counties, setCounties] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [newCode, setNewCode] = useState<{ name: string; code: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Coordinator | null>(null);

  useEffect(() => {
    setLoading(true);
    return subscribeToCoordinators(
      campaign.slug,
      (list) => {
        setCoordinators(list.sort((a, b) => a.name.localeCompare(b.name)));
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [campaign.slug]);

  function startNew() {
    setEditing('new');
    setName('');
    setEmail('');
    setCounties(new Set());
    setNewCode(null);
  }

  function startEdit(c: Coordinator) {
    setEditing(c);
    setName(c.name);
    setEmail(c.email);
    setCounties(new Set(c.counties));
    setNewCode(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (counties.size === 0) {
      alert('Assign at least one county.');
      return;
    }
    setSaving(true);
    try {
      const data = { name: name.trim(), email: email.trim(), counties: [...counties].sort() };
      if (editing === 'new') {
        const code = await createCoordinator(campaign.slug, data);
        setNewCode({ name: data.name, code });
      } else if (editing) {
        await updateCoordinator(editing.id, data);
      }
      setEditing(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save coordinator.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteCoordinator(deleteTarget.id);
    } catch {
      alert('Failed to delete coordinator.');
    } finally {
      setDeleteTarget(null);
    }
  }

  if (loading) return <LoadingSpinner message="Loading coordinators..." />;

  const adminUrl = `${window.location.origin}${window.location.pathname}#/c/${campaign.slug}/admin`;

  return (
    <div className="coordinators-panel">
      <p className="import-muted">
        Regional coordinators log in on the Admin tab with their own code. They see and manage only their
        assigned counties: polling locations, claims, sign placements, planned signs, distribution points,
        reports and reminders.
      </p>

      {newCode && (
        <div className="coordinator-code-box">
          <strong>Login code for {newCode.name}:</strong>
          <code className="coordinator-code">{newCode.code}</code>
          <p>
            Copy this now — it can't be shown again. Send it to them with the admin link:{' '}
            <code>{adminUrl}</code>
          </p>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigator.clipboard?.writeText(`Admin link: ${adminUrl}\nYour coordinator code: ${newCode.code}`)}
          >
            Copy link + code
          </button>
        </div>
      )}

      {!editing && (
        <div className="import-actions">
          <button className="btn btn-primary" onClick={startNew}>+ Add coordinator</button>
        </div>
      )}

      {editing && (
        <form className="coordinator-form" onSubmit={handleSubmit}>
          <h3>{editing === 'new' ? 'New coordinator' : `Edit ${editing.name}`}</h3>
          <div className="import-row">
            <label className="import-field">
              <span>Name</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="import-field">
              <span>Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
          </div>
          <div className="import-field">
            <span>Counties ({counties.size})</span>
            <CountyPicker selected={counties} onChange={setCounties} />
          </div>
          <div className="import-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing === 'new' ? 'Create & generate code' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {coordinators.length === 0 ? (
        <p className="import-muted">No regional coordinators yet.</p>
      ) : (
        <div className="table-wrapper">
          <table className="submissions-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Counties</th><th></th></tr>
            </thead>
            <tbody>
              {coordinators.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : '—'}</td>
                  <td>{c.counties.join(', ')}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => startEdit(c)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(c)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Remove ${deleteTarget.name}? Their login code stops working immediately.`}
          confirmLabel="Remove"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
