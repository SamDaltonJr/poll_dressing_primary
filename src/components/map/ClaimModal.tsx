import { useState, type FormEvent } from 'react';
import { claimLocation } from '../../services/dressingService';
import type { MapMarker } from '../../types';

interface ClaimModalProps {
  marker: MapMarker;
  onClose: () => void;
  onClaimed: () => void;
}

export default function ClaimModal({ marker, onClose, onClaimed }: ClaimModalProps) {
  const [volunteerName, setVolunteerName] = useState(
    () => sessionStorage.getItem('volunteerName') || '',
  );
  const [volunteerPhone, setVolunteerPhone] = useState(
    () => sessionStorage.getItem('volunteerPhone') || '',
  );
  const [volunteerEmail, setVolunteerEmail] = useState(
    () => sessionStorage.getItem('volunteerEmail') || '',
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await claimLocation(marker.id, { volunteerName, volunteerPhone, volunteerEmail });
      sessionStorage.setItem('volunteerName', volunteerName);
      sessionStorage.setItem('volunteerPhone', volunteerPhone);
      sessionStorage.setItem('volunteerEmail', volunteerEmail);
      onClaimed();
    } catch {
      setError('Failed to claim location. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="dressing-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Claim This Location</h3>
        <p className="dressing-modal-location">
          <strong>{marker.label}</strong><br />
          {marker.address}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="vol-name">Your Name</label>
            <input
              id="vol-name"
              type="text"
              value={volunteerName}
              onChange={(e) => setVolunteerName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="vol-phone">Phone Number</label>
            <input
              id="vol-phone"
              type="tel"
              value={volunteerPhone}
              onChange={(e) => setVolunteerPhone(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="vol-email">Email</label>
            <input
              id="vol-email"
              type="email"
              value={volunteerEmail}
              onChange={(e) => setVolunteerEmail(e.target.value)}
              required
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="confirm-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Claiming...' : 'Claim Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
