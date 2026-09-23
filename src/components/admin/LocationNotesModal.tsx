import { useState, type FormEvent } from 'react';
import { updateLocationNotes } from '../../services/pollingLocationService';
import { useCampaign } from '../../contexts/CampaignContext';
import type { LocationNotesPatch, MapMarker } from '../../types';

interface LocationNotesModalProps {
  location: MapMarker;
  onClose: () => void;
  onSaved: () => void;
}

export default function LocationNotesModal({ location, onClose, onSaved }: LocationNotesModalProps) {
  const campaign = useCampaign();
  const [notes, setNotes] = useState(location.notes ?? '');
  const [tip, setTip] = useState(location.tip ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const patch: LocationNotesPatch = { notes: notes.trim() };
    // Keep the original author on the tip unless an admin rewrote it.
    if (tip.trim() !== (location.tip ?? '')) {
      patch.tip = tip.trim();
      patch.tipBy = tip.trim() ? 'Admin' : '';
      patch.tipAt = Date.now();
    }
    try {
      await updateLocationNotes(campaign.slug, location.county, location.id, patch);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save notes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Location Notes</h3>
        <p className="dressing-modal-location">
          <strong>{location.label}</strong><br />
          {location.address}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="loc-notes">Where to go (room, building, entrance)</label>
            <textarea
              id="loc-notes"
              rows={3}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Fellowship Hall, Room 104. Enter from the back parking lot."
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="loc-tip">Volunteer tip</label>
            <textarea
              id="loc-tip"
              rows={3}
              maxLength={500}
              value={tip}
              onChange={(e) => setTip(e.target.value)}
              placeholder="Left by volunteers when they mark a site dressed."
            />
            {location.tip && location.tipBy && (
              <small className="form-hint">
                From {location.tipBy}
                {location.tipAt ? ` on ${new Date(location.tipAt).toLocaleDateString()}` : ''}
              </small>
            )}
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="confirm-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
