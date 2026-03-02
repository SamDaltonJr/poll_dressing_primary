import { useEffect, useState } from 'react';
import { subscribeToSignPickups } from '../services/signPickupService';
import type { SignPickup } from '../types';

export function useSignPickups() {
  const [pickups, setPickups] = useState<SignPickup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToSignPickups(
      (records) => {
        setPickups(records);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return { pickups, loading };
}
