import { useState, type FormEvent } from 'react';
import { adminMarkDressed } from '../../services/dressingService';
import type { MapMarker } from '../../types';

interface AdminDressModalProps {
  marker: MapMarker;
  onClose: () => void;
  onDressed: () => void;
}

export default function AdminDressModal({ marker, onClose, onDressed }: AdminDressModalProps) {
  const [volunteerName, setVolunteerName] = useState('');
  const [volunteerPhone, setVolunteerPhone] = useState('');
  const [volunteerEmail, setVolunteerEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminMarkDressed(marker.id, { volunteerName, volunteerPhone, volunteerEmail });
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
