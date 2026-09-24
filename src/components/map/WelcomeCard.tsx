import { Link } from 'react-router-dom';
import { useCampaign } from '../../contexts/CampaignContext';

interface WelcomeCardProps {
  onDismiss: () => void;
}

/**
 * First-visit overview of the whole job, for volunteers who signed up without
 * knowing what poll dressing involves. Shown once per device; the full guide
 * stays one tap away in the menu.
 */
export default function WelcomeCard({ onDismiss }: WelcomeCardProps) {
  const campaign = useCampaign();

  return (
    <div className="welcome-overlay" onClick={onDismiss}>
      <div
        className="welcome-card"
        role="dialog"
        aria-labelledby="welcome-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="welcome-title">How poll dressing works</h2>
        <p className="welcome-intro">
          &ldquo;Dressing&rdquo; a polling site means putting up {campaign.candidateLastName} signs
          outside it so voters see them on the way in. Here&rsquo;s the whole job:
        </p>
        <ol className="welcome-steps">
          <li>
            <strong>Claim a site.</strong> Tap a <span className="pin-dot pin-dot-red" /> red pin near
            you and claim it, so nobody doubles up. Sites with a &#9733; are the busiest, so start there.
          </li>
          <li>
            <strong>Get signs.</strong> Pick them up at a{' '}
            <span className="pin-dot pin-dot-blue-diamond" /> blue sign pickup point on the map, or ask
            your coordinator.
          </li>
          <li>
            <strong>Put them up and mark it dressed.</strong> Place signs just outside the 100-foot
            marker, then tap <strong>Mark as Dressed</strong>. The pin turns{' '}
            <span className="pin-dot pin-dot-green" /> green.
          </li>
          <li>
            <strong>Take them down.</strong> After voting ends at that site, collect your signs and
            mark them retrieved.
          </li>
        </ol>
        <p className="welcome-note">
          Your claimed sites, with directions, are always under <strong>My Locations</strong> in the menu.
        </p>
        <div className="welcome-actions">
          <Link
            to={`/c/${campaign.slug}/instructions/poll-dressing`}
            className="btn btn-secondary"
            onClick={onDismiss}
          >
            Full guide
          </Link>
          <button type="button" className="btn btn-primary" onClick={onDismiss} autoFocus>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
