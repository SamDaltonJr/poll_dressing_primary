import { useState, type FormEvent } from 'react';
import { addLocationReport } from '../../services/locationReportService';

interface MissingLocationModalProps {
  latitude: number;
  longitude: number;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function MissingLocationModal({
  latitude, longitude, onClose, onSubmitted,
}: MissingLocationModalProps) {
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [reporterName, setReporterName] = useState(
    () => sessionStorage.getItem('volunteerName') || '',
  );
  const [reporterContact, setReporterContact] = useState(
    () => sessionStorage.getItem('volunteerEmail') || '',
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await addLocationReport({
        category: 'missing',
        locationName,
        address,
        latitude,
        longitude,
        existingLocationId: null,
        reporterName,
        reporterContact,
        notes,
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
        <h3>Report Missing Location</h3>
        <p className="dressing-modal-location">
          Pin placed at {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="loc-name">Location Name</label>
            <input
              id="loc-name"
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              required
              autoFocus
              placeholder="e.g. Oak Lawn Library"
            />
          </div>
          <div className="form-group">
            <label htmlFor="loc-address">Address</label>
            <input
              id="loc-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              placeholder="e.g. 1234 Main St, Dallas, TX 75201"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reporter-name">Your Name (optional)</label>
              <input
                id="reporter-name"
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="reporter-contact">Contact (optional)</label>
              <input
                id="reporter-contact"
                type="text"
                value={reporterContact}
                onChange={(e) => setReporterContact(e.target.value)}
                placeholder="Email or phone"
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="loc-notes">Notes (optional)</label>
            <textarea
              id="loc-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any additional context..."
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="confirm-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
