import Papa from 'papaparse';
import type { LocationReport } from '../../types';

interface LocationReportExportButtonProps {
  reports: LocationReport[];
}

export default function LocationReportExportButton({ reports }: LocationReportExportButtonProps) {
  function handleExport() {
    const data = reports.map((r) => ({
      'Category': r.category === 'missing' ? 'Missing' : 'Incorrect',
      'Location Name': r.locationName,
      'Address': r.address,
      'Latitude': r.latitude,
      'Longitude': r.longitude,
      'Existing Location ID': r.existingLocationId || '',
      'Reporter Name': r.reporterName || '',
      'Reporter Contact': r.reporterContact || '',
      'Notes': r.notes || '',
      'Status': r.status === 'pending' ? 'Pending' : 'Resolved',
      'Submitted At': r.createdAt?.toDate?.()?.toISOString() || '',
      'Resolved At': r.resolvedAt?.toDate?.()?.toISOString() || '',
      'Resolved Note': r.resolvedNote || '',
    }));

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `location-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <button className="btn btn-secondary" onClick={handleExport} disabled={reports.length === 0}>
      Export CSV ({reports.length} reports)
    </button>
  );
}
