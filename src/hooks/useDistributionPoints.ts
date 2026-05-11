import { useEffect, useState } from 'react';
import { subscribeToDistributionPoints } from '../services/distributionPointService';
import { useCampaign } from '../contexts/CampaignContext';
import type { DistributionPoint } from '../types';

export function useDistributionPoints() {
  const campaign = useCampaign();
  const [points, setPoints] = useState<DistributionPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToDistributionPoints(
      campaign.slug,
      (records) => {
        setPoints(records);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [campaign.slug]);

  return { points, loading };
}
