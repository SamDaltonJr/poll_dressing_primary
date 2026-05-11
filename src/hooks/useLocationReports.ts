import { useEffect, useState } from 'react';
import { subscribeToLocationReports } from '../services/locationReportService';
import { useCampaign } from '../contexts/CampaignContext';
import type { LocationReport } from '../types';

export function useLocationReports() {
  const campaign = useCampaign();
  const [reports, setReports] = useState<LocationReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToLocationReports(
      campaign.slug,
      (records) => {
        setReports(records);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [campaign.slug]);

  return { reports, loading };
}
