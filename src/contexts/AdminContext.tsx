import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCampaign } from './CampaignContext';
import { sha256, coordinatorIdForCode } from '../utils/hash';
import type { AdminRole, Coordinator } from '../types';

type StoredSession = { role: 'state' } | { role: 'regional'; coordinatorId: string };

interface AdminValue {
  isAdmin: boolean;
  role: AdminRole | null;
  /** Display name for audit fields ("Statewide admin" or the coordinator's name). */
  adminName: string;
  /** Counties this admin may see/manage. null = statewide (no restriction). */
  allowedCounties: Set<string> | null;
  /** True while a saved coordinator session is re-validating on page load. */
  sessionLoading: boolean;
  error: string;
  validate: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AdminCtx = createContext<AdminValue | null>(null);

/** Per-campaign sessionStorage key so logging into one campaign doesn't grant another. */
function storageKey(slug: string): string {
  return `adminSession:${slug}`;
}

function readSession(slug: string): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(storageKey(slug));
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

/**
 * Admin session for the active campaign. The statewide admin password lives
 * (hashed) on campaignSettings/{slug}; regional coordinators each have a doc in
 * `coordinators` keyed by the hash of their login code. A coordinator's county
 * list is subscribed live, so reassigning or deleting them takes effect
 * without a re-login.
 *
 * NOTE: like the access code, this is client-side gating — it controls what
 * the UI shows, not what Firestore permits. See firestore.rules.
 */
export function AdminProvider({ children }: { children: ReactNode }) {
  const campaign = useCampaign();
  const [session, setSession] = useState<StoredSession | null>(() => readSession(campaign.slug));
  const [coordinator, setCoordinator] = useState<Coordinator | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setSession(readSession(campaign.slug));
    setError('');
  }, [campaign.slug]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(storageKey(campaign.slug));
    setSession(null);
    setCoordinator(null);
  }, [campaign.slug]);

  const coordinatorId = session?.role === 'regional' ? session.coordinatorId : null;
  useEffect(() => {
    if (!coordinatorId) {
      setCoordinator(null);
      return;
    }
    return onSnapshot(
      doc(db, 'coordinators', coordinatorId),
      (snap) => {
        if (!snap.exists()) {
          // Revoked by the statewide admin.
          logout();
          return;
        }
        setCoordinator({ id: snap.id, ...snap.data() } as Coordinator);
      },
      (err) => console.error('Coordinator subscription error:', err),
    );
  }, [coordinatorId, logout]);

  const validate = useCallback(async (password: string): Promise<boolean> => {
    try {
      setError('');
      const [adminHash, coordId] = await Promise.all([
        sha256(password),
        coordinatorIdForCode(campaign.slug, password),
      ]);
      const settingsDoc = await getDoc(doc(db, 'campaignSettings', campaign.slug));
      const storedHash = settingsDoc.data()?.adminPasswordHash;
      let next: StoredSession | null = null;
      if (storedHash && adminHash === storedHash) {
        next = { role: 'state' };
      } else {
        const coordDoc = await getDoc(doc(db, 'coordinators', coordId));
        if (coordDoc.exists() && coordDoc.data().campaignId === campaign.slug) {
          next = { role: 'regional', coordinatorId: coordId };
        }
      }
      if (!next) {
        setError('Invalid admin password or coordinator code.');
        return false;
      }
      sessionStorage.setItem(storageKey(campaign.slug), JSON.stringify(next));
      setSession(next);
      return true;
    } catch {
      setError('Unable to verify password. Please try again.');
      return false;
    }
  }, [campaign.slug]);

  const value = useMemo<AdminValue>(() => {
    if (session?.role === 'state') {
      return { isAdmin: true, role: 'state', adminName: 'Statewide admin', allowedCounties: null, sessionLoading: false, error, validate, logout };
    }
    if (session?.role === 'regional' && coordinator) {
      return {
        isAdmin: true,
        role: 'regional',
        adminName: coordinator.name,
        allowedCounties: new Set(coordinator.counties),
        sessionLoading: false,
        error,
        validate,
        logout,
      };
    }
    // Regional session whose coordinator doc hasn't loaded yet counts as
    // logged out for a moment rather than briefly granting statewide scope.
    const sessionLoading = session?.role === 'regional';
    return { isAdmin: false, role: null, adminName: '', allowedCounties: null, sessionLoading, error, validate, logout };
  }, [session, coordinator, error, validate, logout]);

  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>;
}

export function useAdminAuth(): AdminValue {
  const ctx = useContext(AdminCtx);
  if (!ctx) throw new Error('useAdminAuth must be used inside an AdminProvider');
  return ctx;
}

/** True when `county` is inside the admin's scope. Unknown counties are visible only statewide. */
export function inScope(allowed: Set<string> | null, county: string | null | undefined): boolean {
  if (!allowed) return true;
  return !!county && allowed.has(county);
}
