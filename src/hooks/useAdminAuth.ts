import { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(
    () => sessionStorage.getItem('adminValid') === 'true'
  );
  const [error, setError] = useState('');

  async function validate(password: string): Promise<boolean> {
    try {
      setError('');
      const hashHex = await sha256(password);
      const configDoc = await getDoc(doc(db, 'config', 'app'));
      const storedHash = configDoc.data()?.adminPasswordHash;

      if (hashHex === storedHash) {
        sessionStorage.setItem('adminValid', 'true');
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
    sessionStorage.removeItem('adminValid');
    setIsAdmin(false);
  }

  return { isAdmin, error, validate, logout };
}
