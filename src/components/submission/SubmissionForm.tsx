import { useState, type FormEvent } from 'react';
import LocationPicker from './LocationPicker';
import PhotoUploader from './PhotoUploader';
import { createSubmission } from '../../services/submissionService';

export default function SubmissionForm() {
  const [volunteerName, setVolunteerName] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  function handleLocationSet(lat: number, lng: number, addr: string) {
    setLatitude(lat);
    setLongitude(lng);
    setAddress(addr);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!photo) {
      setError('Please add a photo of the sign.');
      return;
    }
    if (latitude === null || longitude === null) {
      setError('Please set the sign location.');
      return;
    }

    setSubmitting(true);
    try {
      await createSubmission({
        volunteerName,
        photo,
        notes,
        latitude,
        longitude,
        address,
      });
      setSuccess(true);
      setVolunteerName('');
      setPhoto(null);
      setNotes('');
      setLatitude(null);
      setLongitude(null);
      setAddress('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="submission-success">
        <h2>Sign Submitted!</h2>
        <p>Your sign placement has been recorded and will appear on the map.</p>
        <button className="btn btn-primary" onClick={() => setSuccess(false)}>
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <form className="submission-form" onSubmit={handleSubmit}>
      <h2>Report a Sign Placement</h2>

      <div className="form-group">
        <label htmlFor="volunteerName">Your Name</label>
        <input
          id="volunteerName"
          type="text"
          value={volunteerName}
          onChange={(e) => setVolunteerName(e.target.value)}
          placeholder="Enter your name"
          required
        />
      </div>

      <div className="form-group">
        <label>Sign Location</label>
        <LocationPicker
          onLocationSet={handleLocationSet}
          selectedLat={latitude}
          selectedLng={longitude}
          selectedAddress={address}
        />
      </div>

      <div className="form-group">
        <label>Photo of Sign</label>
        <PhotoUploader onPhotoSelect={setPhoto} />
      </div>

      <div className="form-group">
        <label htmlFor="notes">Notes (optional)</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Property owner gave permission, high visibility corner..."
          rows={3}
        />
      </div>

      {error && <p className="error-text">{error}</p>}

      <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit Sign Placement'}
      </button>
    </form>
  );
}
