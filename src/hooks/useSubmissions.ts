import { useEffect, useState } from 'react';
import { subscribeToSubmissions } from '../services/submissionService';
import type { SignSubmission } from '../types';

export function useSubmissions() {
  const [submissions, setSubmissions] = useState<SignSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToSubmissions((subs) => {
      setSubmissions(subs);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { submissions, loading };
}
