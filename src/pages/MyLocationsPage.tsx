import { useState, useMemo, type FormEvent } from 'react';
import { useDressings } from '../hooks/useDressings';
import { unclaimLocation } from '../services/dressingService';
import { activeLocations } from '../config/categorizeLocations';
import { MARKER_TYPES } from '../config/constants';
import { buildDirectionsUrls } from '../utils/directions';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { MapMarker, DressingRecord } from '../types';

interface VolunteerLocation {
  location: MapMarker;
  dressing: DressingRecord;
}

export default function MyLocationsPage() {
  const { dressings, loading } = useDressings();

  const [unclaimTarget, setUnclaimTarget] = useState<VolunteerLocation | null>(null);

  const [lookupValue, setLookupValue] = useState(
    () =>
      sessionStorage.getItem('volunteerEmail') ||
      sessionStorage.getItem('volunteerPhone') ||
      '',
  );
  const [searchTerm, setSearchTerm] = useState('');

  const locationMap = useMemo(() => {
    const m = new Map<string, MapMarker>();
    for (const loc of activeLocations) m.set(loc.id, loc);
    return m;
  }, []);

  const myLocations = useMemo<VolunteerLocation[]>(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase().trim();
    const termDigits = term.replace(/\D/g, '');

    return dressings
      .filter((d) => {
        if (!d.isClaimed) return false;
        if (d.volunteerEmail && d.volunteerEmail.toLowerCase() === term) return true;
        if (termDigits.length >= 10 && d.volunteerPhone) {
          const phoneDigits = d.volunteerPhone.replace(/\D/g, '');
          // Strip leading '1' country code for comparison
          const normTerm = termDigits.length === 11 && termDigits.startsWith('1') ? termDigits.slice(1) : termDigits;
          const normPhone = phoneDigits.length === 11 && phoneDigits.startsWith('1') ? phoneDigits.slice(1) : phoneDigits;
          return normTerm === normPhone;
        }
        return false;
      })
      .map((d) => {
        const location = locationMap.get(d.locationId);
        return location ? { location, dressing: d } : null;
      })
      .filter((item): item is VolunteerLocation => item !== null);
  }, [dressings, searchTerm, locationMap]);

  const pending = useMemo(
    () => myLocations.filter((ml) => !ml.dressing.isDressed),
    [myLocations],
  );
  const dressed = useMemo(
    () => myLocations.filter((ml) => ml.dressing.isDressed),
    [myLocations],
  );

  const directionUrls = useMemo(
    () => buildDirectionsUrls(pending.map((p) => p.location.address)),
    [pending],
  );

  const volunteerName = myLocations.length > 0 ? myLocations[0].dressing.volunteerName : '';

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSearchTerm(lookupValue);
  }

  async function handleUnclaim() {
    if (!unclaimTarget) return;
    try {
      await unclaimLocation(unclaimTarget.location.id);
    } catch {
      alert('Failed to unclaim location.');
    } finally {
      setUnclaimTarget(null);
    }
  }

  if (loading) return <LoadingSpinner message="Loading data..." />;

  return (
    <div className="my-locations-page">
      <h2>My Locations</h2>
      <p className="my-locations-subtitle">
        Look up the polling locations you've claimed.
      </p>

      <form className="my-locations-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="lookup-input">Email or Phone Number</label>
          <input
            id="lookup-input"
            type="text"
            value={lookupValue}
            onChange={(e) => setLookupValue(e.target.value)}
            placeholder="Enter your email or phone..."
            required
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Look Up My Locations
        </button>
      </form>

      {searchTerm && myLocations.length === 0 && (
        <div className="my-locations-empty">
          <p>No claimed locations found for "{searchTerm}".</p>
          <p className="text-muted">
            Make sure you're using the same email or phone number you used when
            claiming locations.
          </p>
        </div>
      )}

      {myLocations.length > 0 && (
        <>
          <div className="my-locations-summary">
            Hi {volunteerName}! You have {myLocations.length} location
            {myLocations.length !== 1 ? 's' : ''}.
          </div>

          {pending.length > 0 && directionUrls.length > 0 && (
            <div className="my-locations-directions">
              {directionUrls.length === 1 ? (
                <a
                  href={directionUrls[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  Get Directions ({pending.length} stop
                  {pending.length !== 1 ? 's' : ''})
                </a>
              ) : (
                directionUrls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    Directions Batch {i + 1}
                  </a>
                ))
              )}
            </div>
          )}

          {pending.length > 0 && (
            <div className="my-locations-group">
              <h3 className="my-locations-group-heading">
                Pending ({pending.length})
              </h3>
              <div className="my-locations-list">
                {pending.map((item) => (
                  <div key={item.location.id} className="my-location-card">
                    <div className="my-location-card-info">
                      <span className="my-location-card-name">
                        {item.location.label}
                      </span>
                      <span className="my-location-card-address">
                        {item.location.address}
                      </span>
                    </div>
                    <div className="my-location-card-meta">
                      <span className="dressing-status claimed">Pending</span>
                      <span className="my-location-card-type">
                        {MARKER_TYPES[item.location.type]?.label}
                      </span>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setUnclaimTarget(item)}
                      >
                        Unclaim
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dressed.length > 0 && (
            <div className="my-locations-group">
              <h3 className="my-locations-group-heading">
                Dressed ({dressed.length})
              </h3>
              <div className="my-locations-list">
                {dressed.map((item) => (
                  <div key={item.location.id} className="my-location-card">
                    <div className="my-location-card-info">
                      <span className="my-location-card-name">
                        {item.location.label}
                      </span>
                      <span className="my-location-card-address">
                        {item.location.address}
                      </span>
                    </div>
                    <div className="my-location-card-meta">
                      <span className="dressing-status dressed">Dressed</span>
                      {item.dressing.signCount > 0 && (
                        <span className="my-location-card-signs">
                          {item.dressing.signCount} sign
                          {item.dressing.signCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {unclaimTarget && (
        <ConfirmDialog
          message={`Unclaim "${unclaimTarget.location.label}"? This will make it available for other volunteers.`}
          confirmLabel="Unclaim"
          onConfirm={handleUnclaim}
          onCancel={() => setUnclaimTarget(null)}
        />
      )}
    </div>
  );
}
