import { useEffect, useState } from 'react';
import { subscribeToPlannedSigns } from '../services/plannedSignService';
import { useCampaign } from '../contexts/CampaignContext';
import type { PlannedSignLocation } from '../types';

export function usePlannedSigns() {
  const campaign = useCampaign();
  const [signs, setSigns] = useState<PlannedSignLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToPlannedSigns(
      campaign.slug,
      (records) => {
        setSigns(records);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [campaign.slug]);

  return { signs, loading };
}
