import { useEffect, useState } from 'react';
import { subscribeToPlannedSigns } from '../services/plannedSignService';
import type { PlannedSignLocation } from '../types';

export function usePlannedSigns() {
  const [signs, setSigns] = useState<PlannedSignLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToPlannedSigns(
      (records) => {
        setSigns(records);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return { signs, loading };
}
