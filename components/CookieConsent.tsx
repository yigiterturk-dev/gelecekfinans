"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  readPrivacyConsent, readServerPrivacyConsent, savePrivacyConsent, subscribePrivacyConsent,
} from "@/lib/consent";

export default function CookieConsent() {
  const consent = useSyncExternalStore(
    subscribePrivacyConsent,
    readPrivacyConsent,
    readServerPrivacyConsent,
  );

  if (consent !== null) return null;

  const choose = (value: "accepted" | "rejected") => {
    savePrivacyConsent(value);
  };

  return (
    <aside className="consent-banner" role="dialog" aria-label="Gizlilik tercihleri" aria-live="polite">
      <div>
        <strong>Gizlilik tercihiniz</strong>
        <p>
          Zorunlu işlevlerin yanında, onay verirseniz ziyaretleri ölçmek için Google Analytics ve
          etkinleştirildiğinde reklam hizmetlerini kullanırız. Ayrıntılar için{" "}
          <Link href="/gizlilik-politikasi">Gizlilik Politikası</Link>.
        </p>
      </div>
      <div className="consent-actions">
        <button type="button" className="consent-secondary" onClick={() => choose("rejected")}>
          Yalnızca zorunlu
        </button>
        <button type="button" className="consent-primary" onClick={() => choose("accepted")}>
          Kabul et
        </button>
      </div>
    </aside>
  );
}
