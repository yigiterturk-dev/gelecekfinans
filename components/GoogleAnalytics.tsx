"use client";
import Script from "next/script";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  readPrivacyConsent, readServerPrivacyConsent, subscribePrivacyConsent,
} from "@/lib/consent";

export default function GoogleAnalytics() {
  const [gaId, setGaId] = useState("");
  const consent = useSyncExternalStore(
    subscribePrivacyConsent,
    readPrivacyConsent,
    readServerPrivacyConsent,
  );

  useEffect(() => {
    fetch("/api/site-config")
      .then(r => r.json())
      .then(d => { if (d.ga4Id) setGaId(d.ga4Id); })
      .catch(() => {});
  }, []);

  if (!gaId || consent !== "accepted") return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{'analytics_storage':'granted','ad_storage':'granted','ad_user_data':'granted','ad_personalization':'granted'});gtag('js',new Date());gtag('config','${gaId}',{'anonymize_ip':true});`}
      </Script>
    </>
  );
}
