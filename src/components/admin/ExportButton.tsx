import Papa from 'papaparse';
import { allLocations } from '../../config/categorizeLocations';
import { MARKER_TYPES } from '../../config/constants';
import type { DressingRecord } from '../../types';

interface ExportButtonProps {
  dressings: DressingRecord[];
}

export default function ExportButton({ dressings }: ExportButtonProps) {
  function handleExport() {
    const dressingMap = new Map(dressings.map((d) => [d.locationId, d]));

    const data = allLocations.map((loc) => {
      const d = dressingMap.get(loc.id);
      return {
        'Location Name': loc.label,
        Type: MARKER_TYPES[loc.type]?.label ?? loc.type,
        Address: loc.address,
        Size: loc.size || '',
        Status: d?.isDressed ? 'Dressed' : 'Not Dressed',
        'Volunteer Name': d?.volunteerName || '',
        Phone: d?.volunteerPhone || '',
        Email: d?.volunteerEmail || '',
        'Dressed At': d?.dressedAt?.toDate?.()?.toISOString() || '',
        'Dressed By': d?.dressedBy || '',
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
