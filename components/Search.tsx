"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SafeImage from "@/components/SafeImage";
import { articleCoverFallbackUrl } from "@/lib/article-cover";

interface Article {
  title: string;
  category: string;
  slug: string;
  cover_url: string | null;
  cover_alt: string;
  cover_is_illustrative: boolean;
}

const CATS: Record<string, { l: string; c: string }> = {
  kripto:{l:"KRİPTO",c:"#d97706"},borsa:{l:"BORSA",c:"#16a34a"},
  doviz:{l:"DÖVİZ",c:"#2563eb"},altin:{l:"ALTIN",c:"#b45309"},ekonomi:{l:"EKONOMİ",c:"#475569"},
};

export default function Search() {
  const [open, setOpen]       = useState(false);
  const [q, setQ]             = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [resultQuery, setResultQuery] = useState("");
  const [searchState, setSearchState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [searchRetryKey, setSearchRetryKey] = useState(0);
  const [idx, setIdx]         = useState(0);
  const [prevQ, setPrevQ]     = useState(q);
  const inputRef              = useRef<HTMLInputElement>(null);
  const triggerRef            = useRef<HTMLButtonElement>(null);
  const dialogRef             = useRef<HTMLDivElement>(null);
  const wasOpenRef            = useRef(false);
  const router                = useRouter();

  const query = q.trim();
  const results = query.length >= 2 && resultQuery === query ? articles : [];
  const loadingArticles = query.length >= 2 && (resultQuery !== query || searchState === "loading" || searchState === "idle");
  const loadFailed = query.length >= 2 && resultQuery === query && searchState === "error";

  useEffect(() => {
    if (!open) return;
    if (query.length < 2) {
      setArticles([]);
      setResultQuery(query);
      setSearchState("idle");
      return;
    }

    const controller = new AbortController();
    let active = true;
    setSearchState("loading");
    const timeout = window.setTimeout(() => {
      fetch(`/api/articles/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Article search request failed");
        return response.json();
      })
      .then((data: unknown) => {
        if (!Array.isArray(data)) throw new Error("Invalid article search response");
        if (!active) return;
        setArticles(data as Article[]);
        setResultQuery(query);
        setSearchState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        if (!active) return;
        setArticles([]);
        setResultQuery(query);
        setSearchState("error");
      });
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [open, query, searchRetryKey]);

  const close = useCallback(() => { setOpen(false); setQ(""); setIdx(0); }, []);
  const go    = useCallback((slug: string) => { router.push(`/${slug}`); close(); }, [router, close]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isEditing = active instanceof HTMLElement && (
        active.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)
      );
      if (!isEditing && (e.key === "/" || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) && !open) {
        e.preventDefault(); setOpen(true);
      }
      if (e.key === "Escape") close();
      if (!open) return;
      if (document.activeElement === inputRef.current) {
        if (e.key === "ArrowDown")  { e.preventDefault(); setIdx(i => Math.min(i + 1, Math.max(0, results.length - 1))); }
        if (e.key === "ArrowUp")    { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
        if (e.key === "Enter" && results[idx]) go(results[idx].slug);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [open, results, idx, close, go]);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      inputRef.current?.focus();
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);
  // Sorgu değişince seçili index'i render sırasında sıfırla (effect yerine —
  // React'in "değer değişiminde state ayarla" önerilen pattern'i).
  if (q !== prevQ) { setPrevQ(q); setIdx(0); }

  if (!open) return (
    <button ref={triggerRef} className="search-btn" onClick={() => setOpen(true)} aria-label="Aramayı aç">
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      Ara
      <kbd>/</kbd>
    </button>
  );

  return (
    <div className="search-overlay" onClick={close}>
      <div
        ref={dialogRef}
        className="search-box"
        onClick={e => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
            'input:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
          ) ?? []).filter((element) => element.offsetParent !== null);
          if (!focusable.length) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Site içi arama"
      >
        <div className="search-input-wrap">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            ref={inputRef} type="search" className="search-input" placeholder="Haber ara..." maxLength={200}
            aria-label="Haber ara"
            role="combobox" aria-autocomplete="list" aria-haspopup="listbox"
            aria-expanded={results.length > 0}
            aria-controls="search-results"
            aria-activedescendant={results[idx] ? `search-result-${idx}` : undefined}
            value={q} onChange={e => setQ(e.target.value)}
          />
          {q && <button type="button" onClick={() => setQ("")} className="search-clear" aria-label="Aramayı temizle">×</button>}
        </div>
        <div className="search-divider" />
        <div id="search-results" className="search-results" role={results.length > 0 ? "listbox" : undefined} aria-label={results.length > 0 ? "Hızlı arama sonuçları" : undefined}>
          {q.trim().length < 2 && (
            <div className="search-empty">
              <svg aria-hidden="true" className="search-empty-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              Aramak istediğini yaz
            </div>
          )}
          {q.trim().length >= 2 && loadingArticles && (
            <div className="search-empty" role="status">Haberler yükleniyor…</div>
          )}
          {q.trim().length >= 2 && !loadingArticles && loadFailed && (
            <div className="search-empty" role="alert">
              <p>Arama şu anda yüklenemedi.</p>
              <button
                type="button"
                className="search-retry"
                onClick={() => {
                  setSearchState("loading");
                  setSearchRetryKey((key) => key + 1);
                }}
              >
                Yeniden Dene
              </button>
            </div>
          )}
          {q.trim().length >= 2 && !loadingArticles && !loadFailed && searchState === "ready" && results.length === 0 && (
            <div className="search-empty">&ldquo;{q}&rdquo; için sonuç bulunamadı</div>
          )}
          {results.map((a, i) => {
            const cat = CATS[a.category];
            const imgUrl = a.cover_url;
            return (
              <Link
                key={a.slug}
                id={`search-result-${i}`}
                role="option"
                aria-selected={i === idx}
                href={`/${a.slug}`}
                className={`search-result${i === idx ? " active" : ""}`}
                onClick={close}
                onFocus={() => setIdx(i)}
                onMouseEnter={() => setIdx(i)}
              >
                {imgUrl
                  ? <span className="search-result-thumb">
                      <SafeImage src={imgUrl} fallbackSrc={articleCoverFallbackUrl(a)} alt={a.cover_alt} width={56} height={42} className="search-result-img" />
                      {a.cover_is_illustrative && <span className="search-result-illustrative" aria-hidden="true">TEMSİLİ</span>}
                    </span>
                  : <div className="search-result-img" style={{ borderRadius: 6 }} />
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  {cat && <span className="search-result-cat" style={{ color: `var(--cat-${a.category}, ${cat.c})` }}>{cat.l}</span>}
                  <p className="search-result-title">{a.title}</p>
                </div>
              </Link>
            );
          })}
        </div>
        {q.trim().length >= 2 && (
          <Link
            href={`/arsiv?q=${encodeURIComponent(q.trim())}`}
            className="search-all-results"
            onClick={close}
          >
            Tüm arşiv sonuçlarını gör →
          </Link>
        )}
        <div className="search-hint">
          <span><kbd className="search-key">↑↓</kbd> Gezin</span>
          <span><kbd className="search-key">↵</kbd> Aç</span>
          <span><kbd className="search-key">Esc</kbd> Kapat</span>
        </div>
      </div>
    </div>
  );
}
