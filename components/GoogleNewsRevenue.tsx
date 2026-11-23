"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";
import {
  readPrivacyConsent,
  readServerPrivacyConsent,
  subscribePrivacyConsent,
} from "@/lib/consent";

/** Load the optional Google News Reader Revenue integration only after consent. */
export default function GoogleNewsRevenue() {
  const consent = useSyncExternalStore(
    subscribePrivacyConsent,
    readPrivacyConsent,
    readServerPrivacyConsent,
  );

  if (consent !== "accepted") return null;

  return (
    <>
      <Script
        async
        id="swg-basic"
        src="https://news.google.com/swg/js/v1/swg-basic.js"
        strategy="afterInteractive"
      />
      <Script id="swg-basic-init" strategy="afterInteractive">
        {`(self.SWG_BASIC = self.SWG_BASIC || []).push((basicSubscriptions) => {
          basicSubscriptions.init({
            type: "NewsArticle",
            isPartOfType: ["Product"],
            isPartOfProductId: "CAowvpvNDA:openaccess",
            clientOptions: { theme: "light", lang: "tr" },
          });
        });`}
      </Script>
    </>
  );
}
