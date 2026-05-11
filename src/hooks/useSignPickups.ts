import { useEffect, useState } from 'react';
import { subscribeToSignPickups } from '../services/signPickupService';
import { useCampaign } from '../contexts/CampaignContext';
import type { SignPickup } from '../types';

export function useSignPickups() {
  const campaign = useCampaign();
  const [pickups, setPickups] = useState<SignPickup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToSignPickups(
      campaign.slug,
      (records) => {
        setPickups(records);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [campaign.slug]);

  return { pickups, loading };
}
