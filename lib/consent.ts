export const CONSENT_STORAGE_KEY = "gf-privacy-consent-v1";
export const CONSENT_EVENT = "gf:privacy-consent";

export type PrivacyConsent = "accepted" | "rejected";

export function readPrivacyConsent(): PrivacyConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "accepted" || value === "rejected" ? value : null;
  } catch {
    return null;
  }
}

export function savePrivacyConsent(value: PrivacyConsent) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    // Depolama kapalı olsa da bu sayfa oturumundaki tercih event ile uygulanır.
  }
  window.dispatchEvent(new CustomEvent<PrivacyConsent>(CONSENT_EVENT, { detail: value }));
}

export function subscribePrivacyConsent(onStoreChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onStoreChange);
  return () => window.removeEventListener(CONSENT_EVENT, onStoreChange);
}

export function readServerPrivacyConsent(): PrivacyConsent | null {
  return null;
}
