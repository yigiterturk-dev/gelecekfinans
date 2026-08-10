"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface ResearchResult {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  snippet: string;
}

const CATEGORIES = ["ekonomi", "kripto", "borsa", "doviz", "altin"];

export default function Research() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  // Hangi sonuç için makale üretiliyor (link bazlı kilit) ve sonuç mesajları.
  const [generating, setGenerating] = useState<string | null>(null);
  const [genMsg, setGenMsg] = useState<Record<string, string>>({});

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const res = await fetch(`/api/admin/research?q=${encodeURIComponent(q)}`);
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Haberler getirilemedi.");
        setResults([]);
      } else {
        setResults(d.results || []);
      }
    } catch {
      setError("Bağlantı hatası, tekrar dene.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  // Seçilen başlıktan tek makale üretir; başarılıysa düzenleme sayfasına geçer.
  async function generate(r: ResearchResult) {
    setGenerating(r.link);
    setGenMsg(m => ({ ...m, [r.link]: "" }));
    try {
      const res = await fetch("/api/admin/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: r.title, summary: r.snippet, source: r.source, sourceUrl: r.link }),
      });
      const d = await res.json();
      if (res.ok && d.articleId) {
        router.push(`/sys-k3m8p/makaleler/${d.articleId}`);
        return;
      }
      if (res.status === 409 && d.articleId) {
        setGenMsg(m => ({ ...m, [r.link]: "Bu başlıktan zaten makale var." }));
      } else {
        setGenMsg(m => ({ ...m, [r.link]: d.error || "Makale üretilemedi." }));
      }
    } catch {
      setGenMsg(m => ({ ...m, [r.link]: "Bağlantı hatası, tekrar dene." }));
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div>
      <div className="adm-page-head">
        <h1 className="adm-h1">Haber Araştır</h1>
      </div>

      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
        Konu veya anahtar kelime yaz; güncel haberleri Google Haberler üzerinden getirir.
        Taslak üretimi için aynı olayın en az iki bağımsız yayıncıda doğrulanması gerekir.
      </p>

      <form onSubmit={search} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Örn: TCMB faiz kararı, bitcoin, dolar kuru..."
          className="adm-input"
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={loading} className="adm-btn adm-btn-primary">
          {loading ? "Aranıyor..." : "Ara"}
        </button>
      </form>

      {error && (
        <div style={{ padding: "10px 14px", marginBottom: 16, background: "var(--dn-soft)", border: "1px solid var(--dn)", borderRadius: 8, color: "var(--dn)", fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Yükleniyor...</p>
      ) : searched && results.length === 0 && !error ? (
        <p style={{ color: "var(--muted)" }}>Sonuç bulunamadı.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {results.map(r => (
            <div key={r.link} className="adm-card"><div className="adm-card-b">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>{r.title}</h3>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>
                    {r.source && <span>{r.source}</span>}
                    {r.pubDate && <span>{new Date(r.pubDate).toLocaleString("tr-TR")}</span>}
                  </div>
                  {r.snippet && <p style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 10 }}>{r.snippet}</p>}
                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    {r.link && (
                      <a href={r.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--accent)" }}>
                        Habere git ↗
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => generate(r)}
                      disabled={generating === r.link}
                      className="adm-btn"
                      style={{ fontSize: 12, padding: "5px 12px" }}
                    >
                      {generating === r.link ? "Üretiliyor (1-2 dk)..." : "Bu konudan makale üret"}
                    </button>
                    {genMsg[r.link] && (
                      <span style={{ fontSize: 11, color: "var(--dn)" }}>{genMsg[r.link]}</span>
                    )}
                  </div>
                </div>
              </div>
            </div></div>
          ))}
        </div>
      )}

      {/* Kategoriler bilgi amaçlı: üretilen makale "ekonomi" olarak kaydedilir, düzenleme ekranından değiştirilebilir */}
      {results.length > 0 && (
        <p style={{ marginTop: 16, fontSize: 11, color: "var(--muted)" }}>
          Üretilen makaleler TASLAK olarak kaydedilir (kategori varsayılan: {CATEGORIES[0]}).
          Düzenleme ekranından gözden geçirip yayınlayabilirsin.
        </p>
      )}
    </div>
  );
}
