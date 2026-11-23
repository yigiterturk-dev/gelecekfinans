"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  readPrivacyConsent,
  readServerPrivacyConsent,
  savePrivacyConsent,
  subscribePrivacyConsent,
  subscribePrivacyPreferencesOpen,
} from "@/lib/consent";

export default function CookieConsent() {
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const rejectButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const consent = useSyncExternalStore(
    subscribePrivacyConsent,
    readPrivacyConsent,
    readServerPrivacyConsent,
  );
  const previousConsentRef = useRef(consent);

  useEffect(() => {
    const previous = previousConsentRef.current;
    previousConsentRef.current = consent;
    // Reload after a saved choice changes locally or in another tab, since
    // Google scripts already inserted into the document cannot be unloaded.
    if (previous !== null && consent !== previous) window.location.reload();
  }, [consent]);

  useEffect(() => subscribePrivacyPreferencesOpen(() => {
    const activeElement = document.activeElement;
    restoreFocusRef.current = activeElement instanceof HTMLElement ? activeElement : null;
    setPreferencesOpen(true);
  }), []);

  useEffect(() => {
    if (preferencesOpen && consent !== null) rejectButtonRef.current?.focus();
  }, [preferencesOpen, consent]);

  if (consent !== null && !preferencesOpen) return null;

  const choose = (value: "accepted" | "rejected") => {
    const changedExistingPreference = consent !== null && consent !== value;
    savePrivacyConsent(value);
    setPreferencesOpen(false);
    // The consent-change effect reloads a changed saved choice once. First-time
    // choices and unchanged preferences can simply restore focus.
    if (changedExistingPreference) return;
    const opener = restoreFocusRef.current;
    if (opener) {
      window.requestAnimationFrame(() => {
        if (opener.isConnected) opener.focus();
      });
    }
  };

  return (
    <aside className="consent-banner" role="dialog" aria-labelledby="privacy-preferences-title"
      aria-describedby="privacy-preferences-description" aria-modal="false" aria-live="polite">
      <div>
        <strong id="privacy-preferences-title">Gizlilik tercihiniz</strong>
        <p id="privacy-preferences-description">
          Onay verirseniz Google Analytics ölçümü ve Google Haberler&apos;in okuyucu gelir özellikleri
          çalışır; etkinleştirildiyse reklam hizmetleri de kullanılır. Ayrıntılar için{" "}
          <Link href="/gizlilik-politikasi">Gizlilik Politikası</Link> ve{" "}
          <Link href="/cerez-politikasi">Çerez Politikası</Link>.
        </p>
      </div>
      <div className="consent-actions">
        <button ref={rejectButtonRef} type="button" className="consent-secondary" onClick={() => choose("rejected")}>
          Yalnızca zorunlu
        </button>
        <button type="button" className="consent-primary" onClick={() => choose("accepted")}>
          Kabul et
        </button>
      </div>
    </aside>
  );
}
