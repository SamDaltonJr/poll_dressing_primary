import { createContext, useContext, useEffect, useMemo } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import type { CampaignConfig } from '../config/campaigns';
import { getCampaign } from '../config/campaigns';

const CampaignCtx = createContext<CampaignConfig | null>(null);

/**
 * Route element. Reads :campaignSlug from the URL, looks up the matching campaign
 * config, and either renders nested routes inside a CampaignContext provider or
 * redirects to the picker landing page on an unknown slug.
 *
 * Sets brand-color CSS variables on a wrapper div so every descendant component
 * picks up campaign theming via existing --color-primary cascading.
 */
export function CampaignProvider() {
  const { campaignSlug } = useParams<{ campaignSlug: string }>();
  const campaign = useMemo(() => getCampaign(campaignSlug), [campaignSlug]);

  // Archive entries don't have a working SPA route — their data lives in a
  // separate Firebase project served by a different deploy. Bounce direct URL
  // access (e.g. someone bookmarking /c/james-talarico-senate) out to the
  // archive deploy. Use a real navigation, not <Navigate>, since we're leaving
  // the SPA. See CampaignPickerPage for why dev appends index.html.
  useEffect(() => {
    if (campaign?.isArchive && campaign.archiveUrl) {
      const href = import.meta.env.DEV
        ? `${import.meta.env.BASE_URL}${campaign.archiveUrl}index.html`
        : `${import.meta.env.BASE_URL}${campaign.archiveUrl}`;
      window.location.replace(href);
    }
  }, [campaign]);

  if (!campaign) {
    return <Navigate to="/" replace />;
  }

  if (campaign.isArchive) {
    // Effect above handles the redirect; render nothing meaningful in the
    // meantime to avoid flashing the archived campaign's branded chrome.
    return null;
  }

  const styleOverrides = {
    ['--color-primary' as string]: campaign.primaryColor,
    ['--color-primary-hover' as string]: campaign.primaryHoverColor,
    ['--color-accent' as string]: campaign.accentColor,
  } as React.CSSProperties;

  return (
    <CampaignCtx.Provider value={campaign}>
      <div className="campaign-root" style={styleOverrides}>
        <Outlet />
      </div>
    </CampaignCtx.Provider>
  );
}

/** Returns the active campaign — throws if called outside a CampaignProvider. */
export function useCampaign(): CampaignConfig {
  const ctx = useContext(CampaignCtx);
  if (!ctx) {
    throw new Error('useCampaign must be used inside a CampaignProvider route');
  }
  return ctx;
}

/** Optional variant — returns null instead of throwing, for components that may render outside. */
export function useCampaignOptional(): CampaignConfig | null {
  return useContext(CampaignCtx);
}
