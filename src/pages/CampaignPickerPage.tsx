import { Link } from 'react-router-dom';
import { listCampaigns } from '../config/campaigns';
import type { CampaignConfig } from '../config/campaigns';

/** Two-letter initials from a candidate's full name, for the no-logo fallback. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function PickerCardBody({ c }: { c: CampaignConfig }) {
  return (
    <>
      <div className="picker-card-logo">
        {c.logoUrl ? (
          <img src={c.logoUrl} alt={`${c.candidateName} logo`} />
        ) : (
          <div className="picker-card-logo-fallback" aria-hidden="true">
            {initials(c.candidateName)}
          </div>
        )}
      </div>
      <div className="picker-card-body">
        <div className="picker-card-district">
          {c.isArchive ? (
            <>
              <span className="picker-card-archive-badge">Archive</span>
              {c.homeDistrict && <span className="picker-card-district-text">{c.homeDistrict}</span>}
            </>
          ) : (
            c.homeDistrict
          )}
        </div>
        <h2 className="picker-card-name">{c.candidateName}</h2>
        <p className="picker-card-tagline">{c.tagline}</p>
        <span className="picker-card-cta">
          {c.isArchive ? 'View archive →' : 'Open volunteer site →'}
        </span>
      </div>
    </>
  );
}

export default function CampaignPickerPage() {
  const campaigns = listCampaigns();

  return (
    <div className="picker">
      <header className="picker-header">
        <h1>Campaign Sign Tracker</h1>
        <p className="picker-sub">Choose your campaign to continue.</p>
      </header>

      <div className="picker-grid">
        {campaigns.map((c) => {
          const cardStyle = {
            ['--card-primary' as string]: c.primaryColor,
            ['--card-accent' as string]: c.accentColor,
          } as React.CSSProperties;
          const cardClass = `picker-card${c.isArchive ? ' picker-card-archive' : ''}`;

          if (c.isArchive && c.archiveUrl) {
            // Archive cards leave the SPA — full-page navigation to a separate
            // build that talks to the historical Firebase project.
            //
            // In dev, Vite's SPA fallback intercepts trailing-slash directory
            // requests before checking public/<dir>/index.html, so we append
            // the explicit filename. Production (GH Pages) serves directory
            // indexes natively, so we keep the clean trailing-slash URL.
            const href = import.meta.env.DEV
              ? `${import.meta.env.BASE_URL}${c.archiveUrl}index.html`
              : `${import.meta.env.BASE_URL}${c.archiveUrl}`;
            return (
              <a key={c.slug} href={href} className={cardClass} style={cardStyle}>
                <PickerCardBody c={c} />
              </a>
            );
          }

          return (
            <Link key={c.slug} to={`/c/${c.slug}`} className={cardClass} style={cardStyle}>
              <PickerCardBody c={c} />
            </Link>
          );
        })}
      </div>

      <footer className="picker-footer">
        Built by volunteers. May 26 Texas Primary.
      </footer>
    </div>
  );
}
