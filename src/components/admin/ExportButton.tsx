import Papa from 'papaparse';
import { MARKER_TYPES } from '../../config/constants';
import type { DressingRecord, MapMarker } from '../../types';

interface ExportButtonProps {
  dressings: DressingRecord[];
  locations: MapMarker[];
}

export default function ExportButton({ dressings, locations }: ExportButtonProps) {
  function handleExport() {
    const dressingMap = new Map(dressings.map((d) => [d.locationId, d]));

    const data = locations.map((loc) => {
      const d = dressingMap.get(loc.id);
      return {
        'Location Name': loc.label,
        Type: MARKER_TYPES[loc.type]?.label ?? loc.type,
        County: loc.county,
        Address: loc.address,
        Size: loc.size || '',
        Status: d?.isRetrieved ? 'Retrieved' : d?.isDressed ? 'Dressed' : d?.isClaimed ? 'Claimed' : 'Available',
        'Volunteer Name': d?.volunteerName || '',
        Phone: d?.volunteerPhone || '',
        Email: d?.volunteerEmail || '',
        'Dressed At': d?.dressedAt?.toDate?.()?.toISOString() || '',
        'Dressed By': d?.dressedBy || '',
        // For checking pins against Google Maps; fixes go back in through
        // Import Locations → Edit sites, matched by Site ID.
        Latitude: loc.latitude.toFixed(6),
        Longitude: loc.longitude.toFixed(6),
        'Pin in Google Maps': `https://www.google.com/maps/search/?api=1&query=${loc.latitude.toFixed(6)},${loc.longitude.toFixed(6)}`,
        'Search Google Maps': `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${loc.label}, ${loc.address}`)}`,
        'Site ID': loc.id,
      };
    });

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `poll-dressing-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <button className="btn btn-secondary" onClick={handleExport}>
      Export CSV
    </button>
  );
}
