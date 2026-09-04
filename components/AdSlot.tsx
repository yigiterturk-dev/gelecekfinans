"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Script from "next/script";
import {
  readPrivacyConsent, readServerPrivacyConsent, subscribePrivacyConsent,
} from "@/lib/consent";

interface Props {
  position: "headerBanner" | "inArticle" | "sidebar" | "afterArticle";
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export default function AdSlot({ position }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [adsenseId, setAdsenseId] = useState("");
  const [slotId, setSlotId] = useState("");
  const consent = useSyncExternalStore(
    subscribePrivacyConsent,
    readPrivacyConsent,
    readServerPrivacyConsent,
  );
  const pushed = useRef(false);

  useEffect(() => {
    fetch("/api/site-config")
      .then(r => r.json())
      .then(d => {
        if (d.adSlots?.[position]) setEnabled(true);
        if (d.adsenseId) setAdsenseId(d.adsenseId);
        if (d.adSlotIds?.[position]) setSlotId(String(d.adSlotIds[position]).trim());
      })
      .catch(() => {});
  }, [position]);

  // Reklam slotunu yalnızca etkin + adsenseId hazır olduğunda, bir kez kayıt et.
  // Otomatik Reklam modunda (birim kimliği yok) push YAPILMAZ: <ins> etiketi
  // basılmadığı için push edilecek birim de yoktur, çağrı konsola hata düşürür.
  useEffect(() => {
    if (!enabled || !adsenseId || !slotId || consent !== "accepted" || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      /* AdSense betiği henüz yüklenmediyse onLoad sonrası yeniden denenir */
    }
  }, [enabled, adsenseId, slotId, consent]);

  if (!enabled || !adsenseId || consent !== "accepted") return null;

  const loader = (
    <Script
      id="adsbygoogle-loader"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
      strategy="afterInteractive"
      crossOrigin="anonymous"
      onLoad={() => {
        if (!slotId || pushed.current) return;
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          pushed.current = true;
        } catch {
          /* no-op */
        }
      }}
    />
  );

  /**
   * Birim kimliği YOKSA Otomatik Reklam modu: sadece betik yüklenir,
   * yerleşimi Google seçer. Boş `data-ad-slot` ile <ins> basmak AdSense'in
   * reklam sunmamasına yol açıyordu — kapsayıcı görünür, içi hep boş kalırdı.
   * Bu modda kapsayıcı da basılmaz ki sayfada boş kutu durmasın.
   */
  if (!slotId) return loader;

  return (
    // CLS-güvenli kapsayıcı (min-height globals.css'te) — yapı korunuyor.
    <div className={`ad-slot ${position === "headerBanner" ? "ad-slot-sm" : "ad-slot-lg"}`}>
      {loader}
      <ins className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={adsenseId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true" />
    </div>
  );
}
