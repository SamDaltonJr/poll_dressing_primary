import { useEffect, useState } from 'react';
import { subscribeToSubmissions } from '../services/submissionService';
import { useCampaign } from '../contexts/CampaignContext';
import type { SignSubmission } from '../types';

export function useSubmissions() {
  const campaign = useCampaign();
  const [submissions, setSubmissions] = useState<SignSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToSubmissions(
      campaign.slug,
      (subs) => {
        setSubmissions(subs);
        setLoading(false);
      },
      () => {
        // Permission errors or a missing composite index shouldn't keep the
        // map page on the loading spinner forever — surface an empty list.
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [campaign.slug]);

  return { submissions, loading };
}
