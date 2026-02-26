import { useEffect, useState } from 'react';
import { subscribeToLocationReports } from '../services/locationReportService';
import type { LocationReport } from '../types';

export function useLocationReports() {
  const [reports, setReports] = useState<LocationReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToLocationReports(
      (records) => {
        setReports(records);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return { reports, loading };
}
