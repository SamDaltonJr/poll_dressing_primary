import { useEffect, useState } from 'react';
import { subscribeToDistributionPoints } from '../services/distributionPointService';
import type { DistributionPoint } from '../types';

export function useDistributionPoints() {
  const [points, setPoints] = useState<DistributionPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToDistributionPoints(
      (records) => {
        setPoints(records);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return { points, loading };
}
