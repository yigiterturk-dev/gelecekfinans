"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Search from "./Search";

const CATS=[
  {k:"kripto",l:"Kripto Para"},
  {k:"borsa",l:"Borsa"},
  {k:"doviz",l:"Döviz"},
  {k:"altin",l:"Altın"},
  {k:"ekonomi",l:"Ekonomi"},
];

// Canlı piyasa verisi & araç sayfaları
const MARKET=[
  {h:"/doviz",l:"Döviz Kurları"},
  {h:"/altin",l:"Altın Fiyatları"},
  {h:"/borsa",l:"BIST 100"},
  {h:"/kripto",l:"Kripto Fiyatları"},
  {h:"/faiz",l:"Faiz"},
  {h:"/araclar",l:"Araçlar"},
  {h:"/rehber",l:"Rehberler"},
];

export default function Navbar(){
  const p=usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const activeTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta DOM'dan tema senkronu (kasıtlı)
    setTheme(activeTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return(
    <div className="nav">
      <div className="nav-brand-row">
        <Link href="/" className="nav-brand-link" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 9,
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 23 L13 14 L19 19 L27 7" />
              <circle cx="27" cy="7" r="2.6" fill="#00b35f" stroke="none" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{
              fontFamily: "var(--serif)",
              fontSize: 23,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "var(--ink)",
              lineHeight: 1.05,
              whiteSpace: "nowrap"
            }}>
              Gelecek Finans
            </div>
            <div style={{
              fontFamily: "var(--serif)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--accent)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginTop: 2
            }}>
              Finans &amp; Ekonomi
            </div>
          </div>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Search/>
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            aria-label={theme === "light" ? "Karanlık moda geç" : "Aydınlık moda geç"}
            title={theme === "light" ? "Karanlık moda geç" : "Aydınlık moda geç"}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 6,
              color: "var(--faint)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.2s ease, transform 0.3s ease",
            }}
          >
            {theme === "light" ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
              </svg>
            )}
          </button>
        </div>
      </div>
      <div className="nav-cat-row">
        <Link href="/" className={`nav-cat${p==="/"?" act":""}`}>Tüm Haberler</Link>
        {CATS.map(c=> (
          <Link key={c.k} href={`/kategori/${c.k}`} className={`nav-cat${p===`/kategori/${c.k}`?" act":""}`}>{c.l}</Link>
        ))}
        {MARKET.map(m=> (
          <Link key={m.h} href={m.h} className={`nav-cat nav-cat-market${p===m.h||p.startsWith(m.h+"/")?" act":""}`}>{m.l}</Link>
        ))}
      </div>
    </div>
  );
}
