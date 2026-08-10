import type { Metadata } from "next";
import { IBM_Plex_Serif, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ChromeGate from "@/components/ChromeGate";
import SiteFooter from "@/components/SiteFooter";
import CryptoTicker from "@/components/CryptoTicker";
import BreakingNews from "@/components/BreakingNews";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import PageTracker from "@/components/PageTracker";
import { Analytics } from "@vercel/analytics/react";
import { getSettings } from "@/lib/settings";
import CookieConsent from "@/components/CookieConsent";

const BASE = "https://gelecekfinans.com";

// Kurumsal finans-portalı tipografisi (Yön A — Bloomberg/Reuters havası):
//  · IBM Plex Serif → otoriter MANŞET & logo fontu
//  · IBM Plex Sans  → temiz, kararlı GÖVDE/arayüz fontu
//  · IBM Plex Mono  → tabular rakamlar, kategori etiketleri, piyasa verisi
const fraunces = IBM_Plex_Serif({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
  weight: ["400", "500", "600", "700"],
});
const grotesk = IBM_Plex_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});
const jetbrains = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
});

// Metadata DB tabanlı: Google Search Console doğrulama kodu admin panelden
// (Site Ayarları → Google Search Console) yönetilir. Bu yüzden static `metadata`
// yerine async `generateMetadata` kullanıyoruz.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const gscCode = settings.searchConsoleVerification?.trim();

  return {
    title: { default: "GelecekFinans — Finans & Ekonomi Haberleri", template: "%s | GelecekFinans" },
    description: "Borsa, döviz, kripto para, altın ve ekonomi alanında güncel haberler ve analizler.",
    // İkonlar dosya tabanlı convention ile sunulur: app/icon.svg (favicon) ve
    // app/apple-icon.tsx (apple touch). Next bunları otomatik olarak <head>'e
    // ekler; bu yüzden burada açık `icons` tanımı yok (icon.svg öncelikli).
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    // Search Console doğrulaması: admin'de değer varsa onu, yoksa hiç ekleme.
    ...(gscCode ? { verification: { google: gscCode } } : {}),
    metadataBase: new URL(BASE),
    alternates: { types: { "application/rss+xml": "/feed.xml" } },
    other: { "theme-color": "#ffffff", "apple-mobile-web-app-capable": "yes" },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      siteName: "GelecekFinans",
      title: "GelecekFinans — Finans & Ekonomi Haberleri",
      description: "Borsa, döviz, kripto para, altın ve ekonomi alanında güncel haberler ve analizler.",
      url: BASE,
    },
    twitter: {
      card: "summary_large_image",
      title: "GelecekFinans",
      description: "Borsa, döviz, kripto para, altın ve ekonomi alanında güncel haberler.",
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${fraunces.variable} ${grotesk.variable} ${jetbrains.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('theme');
                  if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="pb-ticker">
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({
          "@context":"https://schema.org",
          "@graph":[
            {
              "@type":"NewsMediaOrganization",
              "@id":`${BASE}/#organization`,
              name:"GelecekFinans",
              url:BASE,
              logo:{"@type":"ImageObject",url:`${BASE}/icon.svg`,width:512,height:512},
              foundingDate:"2026",
              publishingPrinciples:`${BASE}/yayincilik-ilkeleri`,
              ethicsPolicy:`${BASE}/yayincilik-ilkeleri`,
              correctionsPolicy:`${BASE}/yayincilik-ilkeleri#duzeltme-politikasi`,
              contactPoint:{"@type":"ContactPoint",contactType:"editorial",email:"iletisim@gelecekfinans.com",availableLanguage:"Turkish"}
            },
            {
              "@type":"WebSite",
              "@id":`${BASE}/#website`,
              name:"GelecekFinans",
              url:BASE,
              inLanguage:"tr-TR",
              publisher:{"@id":`${BASE}/#organization`}
            }
          ]
        }).replace(/</g,"\\u003c")}}/>
        <GoogleAnalytics />
        <a href="#main" className="skip-link">İçeriğe geç</a>
        <ChromeGate>
          <BreakingNews />
          <Navbar />
        </ChromeGate>
        <main id="main">{children}</main>
        <ChromeGate>
          <SiteFooter />
          <CryptoTicker />
        </ChromeGate>
        <PageTracker />
        <Analytics />
        <CookieConsent />
      </body>
    </html>
  );
}
