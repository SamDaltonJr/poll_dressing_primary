import Papa from 'papaparse';
import type { SignSubmission } from '../../types';

interface ExportButtonProps {
  submissions: SignSubmission[];
}

export default function ExportButton({ submissions }: ExportButtonProps) {
  function handleExport() {
    const data = submissions.map((s) => ({
      'Volunteer Name': s.volunteerName,
      'Phone': s.volunteerPhone || '',
      'Email': s.volunteerEmail || '',
      Address: s.address,
      Latitude: s.latitude,
      Longitude: s.longitude,
      'Posting Method': s.postingMethod || '',
      'Sign Count': s.signCount || 1,
      Notes: s.notes,
      'Photo URL': s.photoUrl,
      'Created At': s.createdAt?.toDate?.()?.toISOString() || '',
    }));

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `sign-placements-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <button className="btn btn-secondary" onClick={handleExport} disabled={submissions.length === 0}>
      Export CSV ({submissions.length} records)
    </button>
  );
}
