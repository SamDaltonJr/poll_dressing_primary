import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCampaign } from '../contexts/CampaignContext';
import { sha256 } from '../utils/hash';

/**
 * Hash + sessionStorage keys are namespaced by campaign slug so a volunteer
 * who entered one campaign's code in this browser doesn't inherit access to
 * another campaign — they have to enter that campaign's code separately.
 */
function storageKey(slug: string): string {
  return `accessCodeValid:${slug}`;
}

export function useAccessCode() {
  const campaign = useCampaign();
  const [isValid, setIsValid] = useState(
    () => sessionStorage.getItem(storageKey(campaign.slug)) === 'true',
  );
  const [error, setError] = useState('');

  // Cross-campaign navigation: re-read sessionStorage under the new slug so
  // validity tracks the active campaign rather than the initial mount's slug.
  useEffect(() => {
    setIsValid(sessionStorage.getItem(storageKey(campaign.slug)) === 'true');
    setError('');
  }, [campaign.slug]);

  async function validate(code: string): Promise<boolean> {
    try {
      setError('');
      const hashHex = await sha256(code);
      const settingsDoc = await getDoc(doc(db, 'campaignSettings', campaign.slug));
      const storedHash = settingsDoc.data()?.accessCodeHash;

      if (storedHash && hashHex === storedHash) {
        sessionStorage.setItem(storageKey(campaign.slug), 'true');
        setIsValid(true);
        return true;
      }
      setError('That code didn’t work. Check it with your coordinator — it’s case-sensitive.');
      return false;
    } catch {
      setError('Couldn’t check the code. Check your connection and try again.');
      return false;
    }
  }

  return { isValid, error, validate };
}
