import { HashRouter, Navigate, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { CampaignProvider, useCampaign } from './contexts/CampaignContext';
import CampaignPickerPage from './pages/CampaignPickerPage';
import MapPage from './pages/MapPage';

/**
 * Used for routes that are temporarily disabled — bounces back to the campaign's
 * map root. e.g. /submit is deferred for May 26, but any stale bookmarks
 * shouldn't 404, they should land somewhere useful.
 */
function RedirectToCampaignRoot() {
  const campaign = useCampaign();
  return <Navigate to={`/c/${campaign.slug}`} replace />;
}
import MyLocationsPage from './pages/MyLocationsPage';
import PollDressingInstructionsPage from './pages/PollDressingInstructionsPage';
import BigSignInstructionsPage from './pages/BigSignInstructionsPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Landing — campaign picker. No campaign context. */}
        <Route path="/" element={<CampaignPickerPage />} />

        {/* Per-campaign branded views. CampaignProvider sets theme + scope. */}
        <Route path="/c/:campaignSlug" element={<CampaignProvider />}>
          <Route element={<Layout />}>
            <Route index element={<MapPage />} />
            {/* Big-sign submissions deferred for May 26. Anyone with a stale
                /submit bookmark bounces to the map. Restore this route to
                re-enable photo uploads. */}
            <Route path="submit" element={<RedirectToCampaignRoot />} />
            <Route path="my-locations" element={<MyLocationsPage />} />
            <Route path="instructions/poll-dressing" element={<PollDressingInstructionsPage />} />
            <Route path="instructions/big-signs" element={<BigSignInstructionsPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </HashRouter>
  );
}
