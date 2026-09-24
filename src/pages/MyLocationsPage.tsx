import { useState, useMemo, type FormEvent } from 'react';
import { useDressings } from '../hooks/useDressings';
import { useSubmissions } from '../hooks/useSubmissions';
import { unclaimLocation } from '../services/dressingService';
import { markSignRetrieved } from '../services/submissionService';
import { useLocations } from '../contexts/LocationsContext';
import { MARKER_TYPES } from '../config/constants';
import { buildDirectionsUrls, directionsToSite } from '../utils/directions';
import { contactMatches, getVolunteerProfile } from '../utils/volunteerProfile';
import { useCampaign } from '../contexts/CampaignContext';
import { useAccessCode } from '../hooks/useAccessCode';
import AccessCodeModal from '../components/common/AccessCodeModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ConfirmDressedModal from '../components/map/ConfirmDressedModal';
import ConfirmRetrievedModal from '../components/map/ConfirmRetrievedModal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import LocationNotes from '../components/common/LocationNotes';
import type { MapMarker, DressingRecord, SignSubmission } from '../types';

interface VolunteerLocation {
  location: MapMarker;
  dressing: DressingRecord;
}

export default function MyLocationsPage() {
  const campaign = useCampaign();
  const { dressings, loading } = useDressings();
  const { submissions, loading: subsLoading } = useSubmissions();
  const { activeLocations, loading: locationsLoading } = useLocations();
  const { isValid: hasAccessFromHook } = useAccessCode();
  const [localAccess, setLocalAccess] = useState(false);
  const hasAccess = hasAccessFromHook || localAccess;

  const [unclaimTarget, setUnclaimTarget] = useState<VolunteerLocation | null>(null);
  const [dressTarget, setDressTarget] = useState<VolunteerLocation | null>(null);
  const [retrieveTarget, setRetrieveTarget] = useState<VolunteerLocation | null>(null);
  const [signRetrieveTarget, setSignRetrieveTarget] = useState<SignSubmission | null>(null);
  // Dressing and retrieving ask for the volunteer code first, as on the map.
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Open straight onto the volunteer's list when this device remembers them.
  const [lookupValue, setLookupValue] = useState(() => {
    const saved = getVolunteerProfile();
    return saved.email || saved.phone;
  });
  const [searchTerm, setSearchTerm] = useState(lookupValue);

  function withAccess(action: () => void) {
    if (hasAccess) action();
    else setPendingAction(() => action);
  }

  const locationMap = useMemo(() => {
    const m = new Map<string, MapMarker>();
    for (const loc of activeLocations) m.set(loc.id, loc);
    return m;
  }, [activeLocations]);

  const myLocations = useMemo<VolunteerLocation[]>(() => {
    if (!searchTerm) return [];
    return dressings
      .filter((d) => d.isClaimed && contactMatches(searchTerm, d))
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
    () => myLocations.filter((ml) => ml.dressing.isDressed && !ml.dressing.isRetrieved),
    [myLocations],
  );
  const retrieved = useMemo(
    () => myLocations.filter((ml) => ml.dressing.isRetrieved),
    [myLocations],
  );

  const mySigns = useMemo<SignSubmission[]>(() => {
    if (!searchTerm) return [];
    return submissions.filter((s) => contactMatches(searchTerm, s));
  }, [submissions, searchTerm]);

  const mySignsActive = useMemo(() => mySigns.filter((s) => !s.isRetrieved), [mySigns]);
  const mySignsRetrieved = useMemo(() => mySigns.filter((s) => s.isRetrieved), [mySigns]);

  const directionUrls = useMemo(
    () => buildDirectionsUrls(pending.map((p) => p.location.address)),
    [pending],
  );

  const volunteerName = myLocations.length > 0
    ? myLocations[0].dressing.volunteerName
    : mySigns.length > 0
    ? mySigns[0].volunteerName
    : '';

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSearchTerm(lookupValue);
  }

  async function handleUnclaim() {
    if (!unclaimTarget) return;
    try {
      await unclaimLocation(unclaimTarget.location.id, campaign.slug);
    } catch {
      alert('Failed to unclaim location.');
    } finally {
      setUnclaimTarget(null);
    }
  }

  async function handleSignRetrieve() {
    if (!signRetrieveTarget) return;
    try {
      await markSignRetrieved(signRetrieveTarget.id);
    } catch {
      alert('Failed to mark sign as retrieved.');
    } finally {
      setSignRetrieveTarget(null);
    }
  }

  if (loading || subsLoading || locationsLoading) return <LoadingSpinner message="Loading data..." />;

  return (
    <div className="my-locations-page">
      <h2>My Locations</h2>
      <p className="my-locations-subtitle">
        The polling locations you&rsquo;ve claimed, with directions. Mark each one dressed once your signs are up.
      </p>

      <form className="my-locations-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="lookup-input">Email or Phone Number</label>
          <input
            id="lookup-input"
            type="text"
            value={lookupValue}
            onChange={(e) => setLookupValue(e.target.value)}
            placeholder="The email or phone you claimed with"
            autoComplete="email"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Look Up My Locations
        </button>
      </form>

      {searchTerm && myLocations.length === 0 && mySigns.length === 0 && (
        <div className="my-locations-empty">
          <p>No locations{campaign.bigSigns && ' or signs'} found for "{searchTerm}".</p>
          <p className="text-muted">
            Make sure you're using the same email or phone number you used when
            claiming locations{campaign.bigSigns && ' or submitting signs'}.
          </p>
        </div>
      )}

      {(myLocations.length > 0 || mySigns.length > 0) && (
        <>
          <div className="my-locations-summary">
            Hi {volunteerName}! You have {myLocations.length} location
            {myLocations.length !== 1 ? 's' : ''}
            {mySigns.length > 0 && <> and {mySigns.length} big sign{mySigns.length !== 1 ? 's' : ''}</>}.
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
                To dress ({pending.length})
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
                      <LocationNotes location={item.location} />
                    </div>
                    <div className="my-location-card-meta">
                      <span className="dressing-status claimed">To dress</span>
                      <span className="my-location-card-type">
                        {MARKER_TYPES[item.location.type]?.label}
                      </span>
                    </div>
                    <div className="my-location-card-actions">
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => withAccess(() => setDressTarget(item))}
                      >
                        Mark as Dressed
                      </button>
                      <a
                        className="btn btn-sm btn-outline"
                        href={directionsToSite(item.location)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Directions
                      </a>
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
                      <LocationNotes location={item.location} />
                    </div>
                    <div className="my-location-card-meta">
                      <span className="dressing-status dressed">Dressed</span>
                      {item.dressing.signCount > 0 && (
                        <span className="my-location-card-signs">
                          {item.dressing.signCount} sign
                          {item.dressing.signCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => withAccess(() => setRetrieveTarget(item))}
                      >
                        Mark Retrieved
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {retrieved.length > 0 && (
            <div className="my-locations-group">
              <h3 className="my-locations-group-heading">
                Retrieved ({retrieved.length})
              </h3>
              <div className="my-locations-list">
                {retrieved.map((item) => (
                  <div key={item.location.id} className="my-location-card">
                    <div className="my-location-card-info">
                      <span className="my-location-card-name">
                        {item.location.label}
                      </span>
                      <span className="my-location-card-address">
                        {item.location.address}
                      </span>
                      <LocationNotes location={item.location} />
                    </div>
                    <div className="my-location-card-meta">
                      <span className="dressing-status retrieved">Retrieved</span>
                      {item.dressing.retrievedSignCount > 0 && (
                        <span className="my-location-card-signs">
                          {item.dressing.retrievedSignCount} sign
                          {item.dressing.retrievedSignCount !== 1 ? 's' : ''} retrieved
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mySignsActive.length > 0 && (
            <div className="my-locations-group">
              <h3 className="my-locations-group-heading">
                Big Signs — Active ({mySignsActive.length})
              </h3>
              <div className="my-locations-list">
                {mySignsActive.map((sign) => (
                  <div key={sign.id} className="my-location-card">
                    <div className="my-location-card-info">
                      <span className="my-location-card-name">
                        {sign.address}
                      </span>
                      <span className="my-location-card-address">
                        {sign.signCount} sign{sign.signCount !== 1 ? 's' : ''}
                        {sign.postingMethod && <> &middot; {sign.postingMethod}</>}
                      </span>
                    </div>
                    <div className="my-location-card-meta">
                      <span className="dressing-status dressed">Active</span>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => withAccess(() => setSignRetrieveTarget(sign))}
                      >
                        Mark Retrieved
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mySignsRetrieved.length > 0 && (
            <div className="my-locations-group">
              <h3 className="my-locations-group-heading">
                Big Signs — Retrieved ({mySignsRetrieved.length})
              </h3>
              <div className="my-locations-list">
                {mySignsRetrieved.map((sign) => (
                  <div key={sign.id} className="my-location-card">
                    <div className="my-location-card-info">
                      <span className="my-location-card-name">
                        {sign.address}
                      </span>
                      <span className="my-location-card-address">
                        {sign.signCount} sign{sign.signCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="my-location-card-meta">
                      <span className="dressing-status retrieved">Retrieved</span>
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

      {pendingAction && (
        <AccessCodeModal
          onSuccess={() => {
            setLocalAccess(true);
            pendingAction();
            setPendingAction(null);
          }}
          onClose={() => setPendingAction(null)}
        />
      )}

      {dressTarget && (
        <ConfirmDressedModal
          marker={dressTarget.location}
          dressing={dressTarget.dressing}
          onClose={() => setDressTarget(null)}
          onConfirmed={() => setDressTarget(null)}
        />
      )}

      {retrieveTarget && (
        <ConfirmRetrievedModal
          marker={retrieveTarget.location}
          dressing={retrieveTarget.dressing}
          onClose={() => setRetrieveTarget(null)}
          onConfirmed={() => setRetrieveTarget(null)}
        />
      )}

      {signRetrieveTarget && (
        <ConfirmDialog
          message={`Mark the sign at "${signRetrieveTarget.address}" as retrieved?`}
          confirmLabel="Confirm Retrieved"
          onConfirm={handleSignRetrieve}
          onCancel={() => setSignRetrieveTarget(null)}
        />
      )}
    </div>
  );
}
