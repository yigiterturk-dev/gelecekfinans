"use client";
import Link from "next/link";
import { SOCIAL_PROFILES } from "@/lib/social";

/* Şemadaki sameAs ile footer'daki ikonlar aynı kaynaktan (lib/social.ts) besleniyor;
   biri eklenip diğeri unutulduğunda oluşan tutarsızlığı baştan engelliyor. */
const SOCIAL_ICONS: Record<string, string> = {
  x: "M18.9 2H22l-7 8 8.2 12h-6.4l-5-7.3L5.9 22H2.8l7.5-8.6L2.4 2h6.6l4.5 6.7L18.9 2Zm-1.1 18h1.7L7.3 3.8H5.5L17.8 20Z",
  linkedin: "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm6 0h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05C20.6 8.65 22 10.5 22 14v7h-4v-6.2c0-1.5-.03-3.4-2.07-3.4-2.07 0-2.39 1.6-2.39 3.3V21H9V9Z",
  youtube: "M23 12s0-3.4-.43-5.03a2.62 2.62 0 0 0-1.85-1.85C19.1 4.7 12 4.7 12 4.7s-7.1 0-8.72.42a2.62 2.62 0 0 0-1.85 1.85C1 8.6 1 12 1 12s0 3.4.43 5.03c.24.9.94 1.6 1.85 1.85 1.62.42 8.72.42 8.72.42s7.1 0 8.72-.42a2.62 2.62 0 0 0 1.85-1.85C23 15.4 23 12 23 12ZM9.75 15.27V8.73L15.5 12l-5.75 3.27Z",
  instagram: "M12 2.2c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85C2.38 3.96 3.89 2.42 7.15 2.27 8.42 2.21 8.8 2.2 12 2.2Zm0 4.66a5.14 5.14 0 1 0 0 10.28 5.14 5.14 0 0 0 0-10.28Zm0 8.48a3.34 3.34 0 1 1 0-6.68 3.34 3.34 0 0 1 0 6.68Zm5.34-9.87a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z",
};

const CATS = [
  { k: "kripto", l: "Kripto Para" },
  { k: "borsa", l: "Borsa" },
  { k: "doviz", l: "Döviz" },
  { k: "altin", l: "Altın" },
  { k: "ekonomi", l: "Ekonomi" },
];

export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-masthead">
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 14 }}>
            <span style={{ width: 40, height: 40, borderRadius: 9, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="23" height="23" viewBox="0 0 32 32" fill="none" stroke="#0f3d6b" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 23 L13 14 L19 19 L27 7" />
                <circle cx="27" cy="7" r="2.6" fill="#00b35f" stroke="none" />
              </svg>
            </span>
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
              <b style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em", color: "#fff", whiteSpace: "nowrap" }}>Gelecek Finans</b>
              <span style={{ fontFamily: "var(--serif)", fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "#7fa8d8", marginTop: 3 }}>Finans &amp; Ekonomi</span>
            </span>
          </Link>
          <p className="footer-desc">Borsa, döviz, kripto para, altın ve ekonomi alanında bağımsız haberler, veri ve analiz. Piyasayı her sabah anlaşılır kılıyoruz.</p>
          <a href="/feed.xml" className="footer-rss">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M4 11a9 9 0 0 1 9 9h2.5A11.5 11.5 0 0 0 4 8.5V11Zm0 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0-9a14 14 0 0 1 14 14h2.5A16.5 16.5 0 0 0 4 4.5V7Z"/></svg>
            RSS Beslemesi
          </a>
        </div>
        <div className="footer-cols">
          <div className="footer-col">
            <h4>Kategoriler</h4>
            {CATS.map(c => (
              <Link key={c.k} href={`/kategori/${c.k}`} className="footer-link">{c.l}</Link>
            ))}
          </div>
          <div className="footer-col">
            <h4>Piyasalar</h4>
            <Link href="/doviz" className="footer-link">Döviz Kurları</Link>
            <Link href="/altin" className="footer-link">Altın Fiyatları</Link>
            <Link href="/borsa" className="footer-link">Borsa (BIST 100)</Link>
            <Link href="/rehber" className="footer-link">Finans Rehberleri</Link>
            <Link href="/kripto" className="footer-link">Kripto Fiyatları</Link>
            <Link href="/araclar" className="footer-link">Hesaplama Araçları</Link>
          </div>
          <div className="footer-col">
            <h4>Kurumsal</h4>
            <Link href="/arsiv" className="footer-link">Haber Arşivi</Link>
            <Link href="/hakkimizda" className="footer-link">Hakkımızda</Link>
            <Link href="/kunye" className="footer-link">Künye</Link>
            <Link href="/yazarlar" className="footer-link">Yazarlar</Link>
            <Link href="/yayincilik-ilkeleri" className="footer-link">Yayıncılık İlkeleri</Link>
            <Link href="/iletisim" className="footer-link">İletişim</Link>
            <Link href="/gizlilik-politikasi" className="footer-link">Gizlilik Politikası</Link>
            <Link href="/cerez-politikasi" className="footer-link">Çerez Politikası</Link>
            <Link href="/kullanim-kosullari" className="footer-link">Kullanım Koşulları</Link>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p className="footer-copyright">
          © 2026 GelecekFinans — Yayınlanan içerikler bilgi amaçlıdır, yatırım tavsiyesi değildir.
        </p>
        <div className="footer-social">
          {SOCIAL_PROFILES.map(p => (
            <a key={p.id} href={p.url} aria-label={`${p.label} sayfamız`} target="_blank" rel="me noopener">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={SOCIAL_ICONS[p.id] ?? ""} /></svg>
            </a>
          ))}
          <a href="/feed.xml" aria-label="RSS beslemesi">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 11a9 9 0 0 1 9 9h2.5A11.5 11.5 0 0 0 4 8.5V11Zm0 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0-9a14 14 0 0 1 14 14h2.5A16.5 16.5 0 0 0 4 4.5V7Z"/></svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
