"use client";
import Link from "next/link";

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
            <Link href="/yayincilik-ilkeleri" className="footer-link">Yayıncılık İlkeleri</Link>
            <Link href="/iletisim" className="footer-link">İletişim</Link>
            <Link href="/gizlilik-politikasi" className="footer-link">Gizlilik Politikası</Link>
            <Link href="/kullanim-kosullari" className="footer-link">Kullanım Koşulları</Link>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p className="footer-copyright">
          © 2026 GelecekFinans — Yayınlanan içerikler bilgi amaçlıdır, yatırım tavsiyesi değildir.
        </p>
        <div className="footer-social">
          <a href="/feed.xml" aria-label="RSS beslemesi">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 11a9 9 0 0 1 9 9h2.5A11.5 11.5 0 0 0 4 8.5V11Zm0 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0-9a14 14 0 0 1 14 14h2.5A16.5 16.5 0 0 0 4 4.5V7Z"/></svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
