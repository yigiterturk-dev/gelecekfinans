"use client";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Article { title: string; meta: string; category: string; slug: string; image_path: string | null; }

const CATS: Record<string, { l: string; c: string }> = {
  kripto:{l:"KRİPTO",c:"#d97706"},borsa:{l:"BORSA",c:"#16a34a"},
  doviz:{l:"DÖVİZ",c:"#2563eb"},altin:{l:"ALTIN",c:"#b45309"},ekonomi:{l:"EKONOMİ",c:"#475569"},
};

export default function Search() {
  const [open, setOpen]       = useState(false);
  const [q, setQ]             = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [idx, setIdx]         = useState(0);
  const [prevQ, setPrevQ]     = useState(q);
  const inputRef              = useRef<HTMLInputElement>(null);
  const router                = useRouter();

  useEffect(() => {
    fetch("/api/articles").then(r => r.json()).then(setArticles).catch(() => {});
  }, []);

  const results = useMemo(() => q.trim().length > 1
    ? articles.filter(a =>
        a.title.toLowerCase().includes(q.toLowerCase()) ||
        a.category.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 8)
    : [], [q, articles]);

  const close = useCallback(() => { setOpen(false); setQ(""); setIdx(0); }, []);
  const go    = useCallback((slug: string) => { router.push(`/${slug}`); close(); }, [router, close]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) && !open) {
        e.preventDefault(); setOpen(true);
      }
      if (e.key === "Escape") close();
      if (!open) return;
      if (e.key === "ArrowDown")  { e.preventDefault(); setIdx(i => Math.min(i + 1, results.length - 1)); }
      if (e.key === "ArrowUp")    { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && results[idx]) go(results[idx].slug);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [open, results, idx, close, go]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);
  // Sorgu değişince seçili index'i render sırasında sıfırla (effect yerine —
  // React'in "değer değişiminde state ayarla" önerilen pattern'i).
  if (q !== prevQ) { setPrevQ(q); setIdx(0); }

  if (!open) return (
    <button className="search-btn" onClick={() => setOpen(true)} aria-label="Aramayı aç">
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      Ara
      <kbd>/</kbd>
    </button>
  );

  return (
    <div className="search-overlay" onClick={close}>
      <div className="search-box" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Site içi arama">
        <div className="search-input-wrap">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            ref={inputRef} type="search" className="search-input" placeholder="Haber ara..."
            aria-label="Haber ara"
            value={q} onChange={e => setQ(e.target.value)}
          />
          {q && <button type="button" onClick={() => setQ("")} className="search-clear" aria-label="Aramayı temizle">×</button>}
        </div>
        <div className="search-divider" />
        <div className="search-results">
          {q.trim().length < 2 && (
            <div className="search-empty">
              <svg aria-hidden="true" className="search-empty-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              Aramak istediğini yaz
            </div>
          )}
          {q.trim().length >= 2 && results.length === 0 && (
            <div className="search-empty">&ldquo;{q}&rdquo; için sonuç bulunamadı</div>
          )}
          {results.map((a, i) => {
            const cat = CATS[a.category];
            const imgUrl = a.image_path ? `/api/gorsel?p=${encodeURIComponent(a.image_path.replace(/^.*gelecekfinans-bot\//, ""))}` : null;
            return (
              <div key={a.slug} className={`search-result${i === idx ? " active" : ""}`} onClick={() => go(a.slug)}>
                {imgUrl
                  ? <Image src={imgUrl} alt={a.title} width={56} height={42} className="search-result-img" />
                  : <div className="search-result-img" style={{ borderRadius: 6 }} />
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  {cat && <span className="search-result-cat" style={{ color: `var(--cat-${a.category}, ${cat.c})` }}>{cat.l}</span>}
                  <p className="search-result-title">{a.title}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="search-hint">
          <span><kbd className="search-key">↑↓</kbd> Gezin</span>
          <span><kbd className="search-key">↵</kbd> Aç</span>
          <span><kbd className="search-key">Esc</kbd> Kapat</span>
        </div>
      </div>
    </div>
  );
}
