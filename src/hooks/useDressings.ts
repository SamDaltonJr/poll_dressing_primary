import { useEffect, useState } from 'react';
import { subscribeToDressings } from '../services/dressingService';
import type { DressingRecord } from '../types';

export function useDressings() {
  const [dressings, setDressings] = useState<DressingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToDressings(
      (records) => {
        setDressings(records);
        setLoading(false);
      },
      () => {
        // On permission error, show map with empty dressings (all undressed)
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return { dressings, loading };
}
