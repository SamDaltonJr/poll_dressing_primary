import MapView from '../components/map/MapView';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useSubmissions } from '../hooks/useSubmissions';

export default function MapPage() {
  const { submissions, loading } = useSubmissions();

  if (loading) return <LoadingSpinner message="Loading map data..." />;

  return (
    <div className="map-page">
      <MapView submissions={submissions} />
      <div className="map-legend">
        <span>{submissions.length} sign{submissions.length !== 1 ? 's' : ''} placed</span>
      </div>
    </div>
  );
}
