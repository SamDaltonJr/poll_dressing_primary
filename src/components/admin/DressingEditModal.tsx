import { useState, type FormEvent } from 'react';
import { updateDressingVolunteer } from '../../services/dressingService';
import type { DressingRecord } from '../../types';

interface DressingEditModalProps {
  locationLabel: string;
  dressing: DressingRecord;
  onClose: () => void;
  onSaved: () => void;
}

export default function DressingEditModal({ locationLabel, dressing, onClose, onSaved }: DressingEditModalProps) {
  const [volunteerName, setVolunteerName] = useState(dressing.volunteerName);
  const [volunteerPhone, setVolunteerPhone] = useState(dressing.volunteerPhone || '');
  const [volunteerEmail, setVolunteerEmail] = useState(dressing.volunteerEmail || '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDressingVolunteer(dressing.locationId, {
        volunteerName,
        volunteerPhone,
        volunteerEmail,
      });
      onSaved();
    } catch {
      alert('Failed to update volunteer info.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Edit Volunteer Info</h3>
        <p className="dressing-modal-location">{locationLabel}</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Volunteer Name</label>
            <input
              type="text"
              value={volunteerName}
              onChange={(e) => setVolunteerName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              value={volunteerPhone}
              onChange={(e) => setVolunteerPhone(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={volunteerEmail}
              onChange={(e) => setVolunteerEmail(e.target.value)}
            />
          </div>
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
