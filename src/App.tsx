import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
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
        <Route element={<Layout />}>
          <Route path="/" element={<MapPage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/my-locations" element={<MyLocationsPage />} />
          <Route path="/instructions/poll-dressing" element={<PollDressingInstructionsPage />} />
          <Route path="/instructions/big-signs" element={<BigSignInstructionsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
