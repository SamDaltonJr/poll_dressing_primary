import { useState, type FormEvent } from 'react';
import { adminMarkDressed } from '../../services/dressingService';
import type { MapMarker, DressingRecord } from '../../types';

interface AdminDressModalProps {
  marker: MapMarker;
  dressing?: DressingRecord;
  onClose: () => void;
  onDressed: () => void;
}

export default function AdminDressModal({ marker, dressing, onClose, onDressed }: AdminDressModalProps) {
  const [volunteerName, setVolunteerName] = useState(dressing?.volunteerName ?? '');
  const [volunteerPhone, setVolunteerPhone] = useState(dressing?.volunteerPhone ?? '');
  const [volunteerEmail, setVolunteerEmail] = useState(dressing?.volunteerEmail ?? '');
  const [signCount, setSignCount] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminMarkDressed(
        marker.id,
        { volunteerName, volunteerPhone, volunteerEmail },
        parseInt(signCount, 10) || 1,
      );
      onDressed();
    } catch {
      alert('Failed to mark as dressed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="dressing-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Admin: Mark as Dressed</h3>
        <p className="dressing-modal-location">
          <strong>{marker.label}</strong><br />
          {marker.address}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Volunteer Name</label>
            <input
              type="text"
              value={volunteerName}
              onChange={(e) => setVolunteerName(e.target.value)}
              required
              autoFocus
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
          <div className="form-group">
            <label>Signs Placed</label>
            <input
              type="number"
              min="1"
              value={signCount}
              onChange={(e) => setSignCount(e.target.value)}
              required
            />
          </div>
          <div className="confirm-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Confirm Dressed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
