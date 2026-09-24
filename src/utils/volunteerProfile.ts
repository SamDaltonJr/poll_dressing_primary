/**
 * The volunteer's own name/phone/email, remembered on their device so they
 * don't retype it for every claim or report and My Locations can open on
 * their list. Kept in localStorage (it's their phone); falls back to the
 * sessionStorage keys older builds wrote. Storage can throw in private mode.
 */
export interface VolunteerProfile {
  name: string;
  phone: string;
  email: string;
}

const KEYS = { name: 'volunteerName', phone: 'volunteerPhone', email: 'volunteerEmail' } as const;

function read(key: string): string {
  try {
    return localStorage.getItem(key) || sessionStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

export function getVolunteerProfile(): VolunteerProfile {
  return { name: read(KEYS.name), phone: read(KEYS.phone), email: read(KEYS.email) };
}

export function saveVolunteerProfile(profile: Partial<VolunteerProfile>): void {
  for (const field of ['name', 'phone', 'email'] as const) {
    const value = profile[field]?.trim();
    if (!value) continue;
    try {
      localStorage.setItem(KEYS[field], value);
    } catch {
      try {
        sessionStorage.setItem(KEYS[field], value);
      } catch {
        // Nothing to do — the form just won't be prefilled next time.
      }
    }
  }
}

/** Digits only, without a leading US country code, for phone comparisons. */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
}

/**
 * Whether a record's contact info matches a lookup term (an email, or a
 * phone number with at least 10 digits).
 */
export function contactMatches(term: string, record: { volunteerEmail?: string; volunteerPhone?: string }): boolean {
  const t = term.toLowerCase().trim();
  if (!t) return false;
  if (record.volunteerEmail && record.volunteerEmail.toLowerCase().trim() === t) return true;
  const termDigits = normalizePhone(t);
  if (termDigits.length >= 10 && record.volunteerPhone) {
    return normalizePhone(record.volunteerPhone) === termDigits;
  }
  return false;
}
