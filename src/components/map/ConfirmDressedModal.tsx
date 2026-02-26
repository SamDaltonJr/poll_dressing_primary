import { useState, type FormEvent } from 'react';
import { confirmDressed } from '../../services/dressingService';
import type { MapMarker, DressingRecord } from '../../types';

interface ConfirmDressedModalProps {
  marker: MapMarker;
  dressing: DressingRecord;
  onClose: () => void;
  onConfirmed: () => void;
}

export default function ConfirmDressedModal({ marker, dressing, onClose, onConfirmed }: ConfirmDressedModalProps) {
  const [signCount, setSignCount] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await confirmDressed(marker.id, parseInt(signCount, 10) || 1);
      onConfirmed();
    } catch {
      setError('Failed to confirm. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="dressing-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Confirm Site Dressed</h3>
        <p className="dressing-modal-location">
          <strong>{marker.label}</strong><br />
          {marker.address}
        </p>
        <p className="dressing-modal-claimed-by">
          Claimed by {dressing.volunteerName}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="sign-count">How many signs did you place?</label>
            <input
              id="sign-count"
              type="number"
              min="1"
              value={signCount}
              onChange={(e) => setSignCount(e.target.value)}
              required
              autoFocus
            />
          </div>
          {error && <p className="error-text">{error}</p>}
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
