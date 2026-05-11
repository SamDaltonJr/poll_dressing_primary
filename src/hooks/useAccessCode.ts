import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCampaign } from '../contexts/CampaignContext';

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash + sessionStorage keys are namespaced by campaign slug so a volunteer
 * who entered the Johnson code in this browser cannot navigate to Burge and
 * inherit access — they have to enter Burge's code separately.
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
      setError('Invalid access code. Please try again.');
      return false;
    } catch {
      setError('Unable to verify access code. Please try again.');
      return false;
    }
  }

  return { isValid, error, validate };
}
