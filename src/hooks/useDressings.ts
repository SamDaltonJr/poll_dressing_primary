import { useEffect, useState } from 'react';
import { subscribeToDressings } from '../services/dressingService';
import { useCampaign } from '../contexts/CampaignContext';
import type { DressingRecord } from '../types';

export function useDressings() {
  const campaign = useCampaign();
  const [dressings, setDressings] = useState<DressingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToDressings(
      campaign.slug,
      (records) => {
        setDressings(records);
        setLoading(false);
      },
      () => {
        // On permission error, show map with empty dressings (all undressed).
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [campaign.slug]);

  return { dressings, loading };
}
