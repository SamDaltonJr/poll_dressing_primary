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

/** Per-campaign sessionStorage key — see useAccessCode for the same pattern. */
function storageKey(slug: string): string {
  return `adminValid:${slug}`;
}

export function useAdminAuth() {
  const campaign = useCampaign();
  const [isAdmin, setIsAdmin] = useState(
    () => sessionStorage.getItem(storageKey(campaign.slug)) === 'true',
  );
  const [error, setError] = useState('');

  useEffect(() => {
    setIsAdmin(sessionStorage.getItem(storageKey(campaign.slug)) === 'true');
    setError('');
  }, [campaign.slug]);

  async function validate(password: string): Promise<boolean> {
    try {
      setError('');
      const hashHex = await sha256(password);
      const settingsDoc = await getDoc(doc(db, 'campaignSettings', campaign.slug));
      const storedHash = settingsDoc.data()?.adminPasswordHash;

      if (storedHash && hashHex === storedHash) {
        sessionStorage.setItem(storageKey(campaign.slug), 'true');
        setIsAdmin(true);
        return true;
      }
      setError('Invalid admin password.');
      return false;
    } catch {
      setError('Unable to verify password. Please try again.');
      return false;
    }
  }

  function logout() {
    sessionStorage.removeItem(storageKey(campaign.slug));
    setIsAdmin(false);
  }

  return { isAdmin, error, validate, logout };
}
