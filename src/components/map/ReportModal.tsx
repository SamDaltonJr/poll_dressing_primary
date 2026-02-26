import { useState, type FormEvent } from 'react';
import { reportLocation } from '../../services/dressingService';
import type { MapMarker } from '../../types';

const REASONS = [
  'Signs missing',
  'Signs damaged',
  'Wrong location',
  'Other',
] as const;

interface ReportModalProps {
  marker: MapMarker;
  onClose: () => void;
  onReported: () => void;
}

export default function ReportModal({ marker, onClose, onReported }: ReportModalProps) {
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fullReason = details ? `${reason}: ${details}` : reason;
      await reportLocation(marker.id, fullReason);
      onReported();
    } catch {
      alert('Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="dressing-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Report Issue</h3>
        <p className="dressing-modal-location">
          <strong>{marker.label}</strong><br />
          {marker.address}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>What's wrong?</label>
            <div className="report-reasons">
              {REASONS.map((r) => (
                <label key={r} className="report-reason-option">
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                  />
                  {r}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Additional details (optional)</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder="Any additional context..."
            />
          </div>
          <div className="confirm-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
