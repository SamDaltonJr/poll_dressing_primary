import { useState, type FormEvent } from 'react';
import LocationPicker from './LocationPicker';
import PhotoUploader from './PhotoUploader';
import { createSubmission } from '../../services/submissionService';
import type { PostingMethod } from '../../types';

export default function SubmissionForm() {
  const [volunteerName, setVolunteerName] = useState('');
  const [volunteerPhone, setVolunteerPhone] = useState('');
  const [volunteerEmail, setVolunteerEmail] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [postingMethod, setPostingMethod] = useState<PostingMethod>('fence');
  const [signCount, setSignCount] = useState(1);
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
        volunteerPhone,
        volunteerEmail,
        photo,
        notes,
        latitude,
        longitude,
        address,
        postingMethod,
        signCount,
      });
      setSuccess(true);
      setVolunteerName('');
      setVolunteerPhone('');
      setVolunteerEmail('');
      setPhoto(null);
      setNotes('');
      setLatitude(null);
      setLongitude(null);
      setAddress('');
      setPostingMethod('fence');
      setSignCount(1);
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
    <form className="submission-form" onSubmit={handleSubmit} autoComplete="on">
      <h2>Report a Sign Placement</h2>

      <div className="form-group">
        <label htmlFor="volunteerName">Your Name</label>
        <input
          id="volunteerName"
          name="name"
          type="text"
          autoComplete="name"
          value={volunteerName}
          onChange={(e) => setVolunteerName(e.target.value)}
          placeholder="Enter your name"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="volunteerPhone">Phone Number</label>
        <input
          id="volunteerPhone"
          name="tel"
          type="tel"
          autoComplete="tel"
          value={volunteerPhone}
          onChange={(e) => setVolunteerPhone(e.target.value)}
          placeholder="(555) 555-5555"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="volunteerEmail">Email</label>
        <input
          id="volunteerEmail"
          name="email"
          type="email"
          autoComplete="email"
          value={volunteerEmail}
          onChange={(e) => setVolunteerEmail(e.target.value)}
          placeholder="you@example.com"
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
        <label htmlFor="postingMethod">How was the sign posted?</label>
        <select
          id="postingMethod"
          value={postingMethod}
          onChange={(e) => setPostingMethod(e.target.value as PostingMethod)}
          required
        >
          <option value="fence">Fence</option>
          <option value="tPost">T-Post</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="signCount">Number of signs placed</label>
        <p className="field-hint">Signs are single-sided. Use 2 for higher visibility locations.</p>
        <select
          id="signCount"
          value={signCount}
          onChange={(e) => setSignCount(parseInt(e.target.value))}
          required
        >
          <option value={1}>1 sign</option>
          <option value={2}>2 signs</option>
        </select>
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
