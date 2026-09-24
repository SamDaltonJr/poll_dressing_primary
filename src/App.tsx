import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { CampaignProvider } from './contexts/CampaignContext';
import CampaignPickerPage from './pages/CampaignPickerPage';
import MapPage from './pages/MapPage';
import SubmitPage from './pages/SubmitPage';
import MyLocationsPage from './pages/MyLocationsPage';
import PollDressingInstructionsPage from './pages/PollDressingInstructionsPage';
import BigSignInstructionsPage from './pages/BigSignInstructionsPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Landing — straight to the live campaign when there's only one;
            the full picker (including archives) stays at /campaigns. */}
        <Route path="/" element={<CampaignPickerPage />} />
        <Route path="/campaigns" element={<CampaignPickerPage showAll />} />

        {/* Per-campaign branded views. CampaignProvider sets theme + scope. */}
        <Route path="/c/:campaignSlug" element={<CampaignProvider />}>
          <Route element={<Layout />}>
            <Route index element={<MapPage />} />
            <Route path="submit" element={<SubmitPage />} />
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
