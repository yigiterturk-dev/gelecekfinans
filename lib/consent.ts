export const CONSENT_STORAGE_KEY = "gf-privacy-consent-v1";
export const CONSENT_EVENT = "gf:privacy-consent";
export const CONSENT_PREFERENCES_OPEN_EVENT = "gf:privacy-preferences-open";

export type PrivacyConsent = "accepted" | "rejected";

let sessionConsent: PrivacyConsent | null = null;

function parseConsent(value: string | null): PrivacyConsent | null {
  return value === "accepted" || value === "rejected" ? value : null;
}

export function readPrivacyConsent(): PrivacyConsent | null {
  if (typeof window === "undefined") return null;
  try {
    return parseConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY)) ?? sessionConsent;
  } catch {
    return sessionConsent;
  }
}

export function savePrivacyConsent(value: PrivacyConsent) {
  sessionConsent = value;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    // Depolama kapalı olsa da bu sayfa oturumundaki tercih event ile uygulanır.
  }
  window.dispatchEvent(new CustomEvent<PrivacyConsent>(CONSENT_EVENT, { detail: value }));
}

export function openPrivacyPreferences() {
  window.dispatchEvent(new Event(CONSENT_PREFERENCES_OPEN_EVENT));
}

export function subscribePrivacyPreferencesOpen(onOpen: () => void) {
  window.addEventListener(CONSENT_PREFERENCES_OPEN_EVENT, onOpen);
  return () => window.removeEventListener(CONSENT_PREFERENCES_OPEN_EVENT, onOpen);
}

export function subscribePrivacyConsent(onStoreChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onStoreChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== CONSENT_STORAGE_KEY && event.key !== null) return;
    sessionConsent = parseConsent(event.newValue);
    onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function readServerPrivacyConsent(): PrivacyConsent | null {
  return null;
}
