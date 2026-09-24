import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { claimLocation } from '../../services/dressingService';
import { useCampaign } from '../../contexts/CampaignContext';
import NearbySuggestions from './NearbySuggestions';
import LocationNotes from '../common/LocationNotes';
import { getVolunteerProfile, saveVolunteerProfile } from '../../utils/volunteerProfile';
import { directionsToSite } from '../../utils/directions';
import type { MapMarker, DressingRecord } from '../../types';

interface ClaimModalProps {
  marker: MapMarker;
  dressings: DressingRecord[];
  onClose: () => void;
  onClaimed: () => void;
}

export default function ClaimModal({ marker, dressings, onClose, onClaimed }: ClaimModalProps) {
  const campaign = useCampaign();
  const [saved] = useState(getVolunteerProfile);
  const [volunteerName, setVolunteerName] = useState(saved.name);
  const [volunteerPhone, setVolunteerPhone] = useState(saved.phone);
  const [volunteerEmail, setVolunteerEmail] = useState(saved.email);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [claimed, setClaimed] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await claimLocation(marker.id, { volunteerName, volunteerPhone, volunteerEmail }, campaign.slug);
      saveVolunteerProfile({ name: volunteerName, phone: volunteerPhone, email: volunteerEmail });
      setClaimed(true);
    } catch {
      setError('Failed to claim location. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (claimed) {
    return (
      <div className="confirm-overlay" onClick={onClaimed}>
        <div className="dressing-modal" onClick={(e) => e.stopPropagation()}>
          <h3>Location Claimed!</h3>
          <p className="dressing-modal-location">
            <strong>{marker.label}</strong><br />
            {marker.address}
          </p>
          <LocationNotes location={marker} />
          <p className="dressing-modal-hint">
            It&rsquo;s saved to <Link to={`/c/${campaign.slug}/my-locations`}>My Locations</Link>.
            Once your signs are up, tap <strong>Mark as Dressed</strong> there or on this pin.
          </p>
          <NearbySuggestions referenceLocation={marker} dressings={dressings} />
          <div className="confirm-actions">
            <a className="btn btn-secondary" href={directionsToSite(marker)} target="_blank" rel="noopener noreferrer">
              Directions
            </a>
            <button className="btn btn-primary" onClick={onClaimed}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="dressing-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Claim This Location</h3>
        <p className="dressing-modal-location">
          <strong>{marker.label}</strong><br />
          {marker.address}
        </p>
        <LocationNotes location={marker} />
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="vol-name">Your Name</label>
            <input
              id="vol-name"
              type="text"
              value={volunteerName}
              onChange={(e) => setVolunteerName(e.target.value)}
              autoComplete="name"
              required
              autoFocus={!saved.name}
            />
          </div>
          <div className="form-group">
            <label htmlFor="vol-phone">Phone Number</label>
            <input
              id="vol-phone"
              type="tel"
              value={volunteerPhone}
              onChange={(e) => setVolunteerPhone(e.target.value)}
              autoComplete="tel"
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
              autoComplete="email"
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
