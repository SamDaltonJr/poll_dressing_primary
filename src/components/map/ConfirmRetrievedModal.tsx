import { useState, type FormEvent } from 'react';
import { markRetrieved } from '../../services/dressingService';
import type { MapMarker, DressingRecord } from '../../types';

interface ConfirmRetrievedModalProps {
  marker: MapMarker;
  dressing: DressingRecord;
  onClose: () => void;
  onConfirmed: () => void;
}

export default function ConfirmRetrievedModal({ marker, dressing, onClose, onConfirmed }: ConfirmRetrievedModalProps) {
  const [signCount, setSignCount] = useState(String(dressing.signCount || 1));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await markRetrieved(marker.id, parseInt(signCount, 10) || 0);
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
        <h3>Confirm Signs Retrieved</h3>
        <p className="dressing-modal-location">
          <strong>{marker.label}</strong><br />
          {marker.address}
        </p>
        <p className="dressing-modal-claimed-by">
          Dressed by {dressing.volunteerName}
          {dressing.signCount > 0 && <> &middot; {dressing.signCount} sign{dressing.signCount !== 1 ? 's' : ''} placed</>}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="retrieved-sign-count">How many signs did you retrieve?</label>
            <input
              id="retrieved-sign-count"
              type="number"
              min="0"
              value={signCount}
              onChange={(e) => setSignCount(e.target.value)}
              required
              autoFocus
            />
            <p className="text-muted" style={{ marginTop: 4, fontSize: '0.85em' }}>
              Enter 0 if no signs were found at this location.
            </p>
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="confirm-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Confirm Retrieved'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
