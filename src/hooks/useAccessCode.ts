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

export function useAccessCode() {
  const [isValid, setIsValid] = useState(
    () => sessionStorage.getItem('accessCodeValid') === 'true'
  );
  const [error, setError] = useState('');

  async function validate(code: string): Promise<boolean> {
    try {
      setError('');
      const hashHex = await sha256(code);
      const configDoc = await getDoc(doc(db, 'config', 'app'));
      const storedHash = configDoc.data()?.accessCodeHash;

      if (hashHex === storedHash) {
        sessionStorage.setItem('accessCodeValid', 'true');
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
