import { useState, type FormEvent } from 'react';
import { addLocationReport } from '../../services/locationReportService';
import type { MapMarker } from '../../types';

const ISSUES = [
  'Wrong address',
  'Wrong name',
  'Wrong pin location',
  'Other',
] as const;

interface IncorrectLocationModalProps {
  marker: MapMarker;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function IncorrectLocationModal({ marker, onClose, onSubmitted }: IncorrectLocationModalProps) {
  const [issue, setIssue] = useState<typeof ISSUES[number]>(ISSUES[0]);
  const [details, setDetails] = useState('');
  const [reporterName, setReporterName] = useState(
    () => sessionStorage.getItem('volunteerName') || '',
  );
  const [reporterContact, setReporterContact] = useState(
    () => sessionStorage.getItem('volunteerEmail') || '',
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!details.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await addLocationReport({
        category: 'incorrect',
        locationName: marker.label,
        address: marker.address,
        latitude: marker.latitude,
        longitude: marker.longitude,
        existingLocationId: marker.id,
        reporterName,
        reporterContact,
        notes: `${issue}: ${details}`,
      });
      onSubmitted();
    } catch {
      setError('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="dressing-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Report Incorrect Info</h3>
        <p className="dressing-modal-location">
          <strong>{marker.label}</strong><br />
          {marker.address}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>What&apos;s incorrect?</label>
            <div className="report-reasons">
              {ISSUES.map((r) => (
                <label key={r} className="report-reason-option">
                  <input
                    type="radio"
                    name="issue"
                    value={r}
                    checked={issue === r}
                    onChange={() => setIssue(r)}
                  />
                  {r}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="incorrect-details">Details</label>
            <textarea
              id="incorrect-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              required
              placeholder="Describe what's incorrect and the correct info..."
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="inc-name">Your Name (optional)</label>
              <input
                id="inc-name"
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="inc-contact">Contact (optional)</label>
              <input
                id="inc-contact"
                type="text"
                value={reporterContact}
                onChange={(e) => setReporterContact(e.target.value)}
                placeholder="Email or phone"
              />
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="confirm-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={submitting || !details.trim()}>
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
