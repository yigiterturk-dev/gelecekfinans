"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

interface ArticleRow {
  id: string; title: string; slug: string; category: string;
  status: string; articleSource: string; seoScore: number | null;
  publishedAt: string | null; createdAt: string; duplicateOf: string | null;
}

function isArticleRow(value: unknown): value is ArticleRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "string"
    && typeof row.title === "string"
    && typeof row.slug === "string"
    && typeof row.category === "string"
    && typeof row.status === "string"
    && typeof row.articleSource === "string"
    && (row.seoScore === null || typeof row.seoScore === "number")
    && (row.publishedAt === null || typeof row.publishedAt === "string")
    && typeof row.createdAt === "string"
    && (row.duplicateOf === null || typeof row.duplicateOf === "string");
}

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: "var(--up)", DRAFT: "#d97706", REJECTED: "var(--dn)", ARCHIVED: "var(--muted)",
};

export default function ArticleList() {
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [bulkPending, setBulkPending] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fetchController = useRef<AbortController | null>(null);

  const fetchArticles = useCallback(async () => {
    fetchController.current?.abort();
    const controller = new AbortController();
    fetchController.current = controller;
    const { signal } = controller;
    setLoading(true);
    setLoadError("");
    const params = new URLSearchParams({ page: String(page) });
    if (filter) params.set("status", filter);
    if (search) params.set("q", search);
    try {
      const response = await fetch(`/api/admin/articles?${params}`, { signal });
      const data: unknown = await response.json().catch(() => null);
      if (signal?.aborted) return;
      if (!response.ok) {
        const message = data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : "Makaleler yüklenemedi.";
        setLoadError(message);
        return;
      }
      if (!data || typeof data !== "object") {
        setLoadError("Sunucudan geçersiz makale listesi geldi.");
        return;
      }
      const payload = data as Record<string, unknown>;
      if (!Array.isArray(payload.articles) || !payload.articles.every(isArticleRow)
        || typeof payload.total !== "number" || !Number.isSafeInteger(payload.total) || payload.total < 0) {
        setLoadError("Sunucudan geçersiz makale listesi geldi.");
        return;
      }
      setArticles(payload.articles);
      setTotal(payload.total);
      setSelected(new Set());
    } catch {
      if (!signal?.aborted) setLoadError("Bağlantı kurulamadı. Tekrar deneyin.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [page, filter, search]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/filtre değişiminde veri çek (kasıtlı)
  useEffect(() => {
    void fetchArticles();
    return () => fetchController.current?.abort();
  }, [fetchArticles]);

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === articles.length) setSelected(new Set());
    else setSelected(new Set(articles.map(a => a.id)));
  }

  async function bulkAction(action: string) {
    if (selected.size === 0 || bulkPending) return;
    if (action === "delete" && !confirm(`${selected.size} makaleyi silmek istediğine emin misin?`)) return;
    const selectedCount = selected.size;
    setBulkPending(true);
    setLoadError("");
    try {
      const response = await fetch("/api/admin/articles/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
          ? result.error
          : "Toplu işlem tamamlanamadı.";
        setLoadError(message);
        return;
      }
      if (!result || typeof result !== "object" || !("affected" in result) || typeof result.affected !== "number") {
        setLoadError("Sunucudan geçersiz işlem sonucu geldi.");
        return;
      }
      const publishFailures = "gorselsizKalan" in result && typeof result.gorselsizKalan === "number"
        ? result.gorselsizKalan
        : 0;
      await fetchArticles();
      if (publishFailures > 0) {
        setLoadError(`${publishFailures} makale için kapak görseli üretilemedi; bu kayıtların toplu yayın işlemi tamamlanmadı.`);
      } else if (result.affected < selectedCount) {
        setLoadError(`İşlem seçilen ${selectedCount} kaydın ${result.affected} tanesinde uygulandı.`);
      }
    } catch {
      setLoadError("Toplu işlem sırasında bağlantı hatası oluştu.");
    } finally {
      setBulkPending(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  // Tek bir makaleyi siler (onaylı), başarılıysa listeden çıkarır + cache'i tazeler.
  async function deleteArticle(id: string, title: string) {
    if (!confirm(`"${title.slice(0, 50)}" makalesi kalıcı olarak silinecek. Emin misin?`)) return;
    const res = await fetch(`/api/admin/articles/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Makale silinemedi.");
      return;
    }
    setArticles(prev => prev.filter(a => a.id !== id));
    setTotal(t => Math.max(0, t - 1));
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
  }

  return (
    <div>
      <div className="adm-page-head">
        <h1 className="adm-h1">Makaleler <span className="adm-count">({total})</span></h1>
        <Link href="/sys-k3m8p/yeni" className="adm-btn adm-btn-primary">
          + Yeni Makale
        </Link>
      </div>

      <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Başlıkta ara..."
          className="adm-input" style={{ flex: 1 }} />
        <button type="submit" className="adm-btn">Ara</button>
        {search && <button type="button" onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }} className="adm-btn">Temizle</button>}
      </form>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["", "PUBLISHED", "DRAFT", "REJECTED", "ARCHIVED"].map(s => (
          <button key={s} onClick={() => { setFilter(s); setPage(1); }}
            className={`adm-pill${filter === s ? " on" : ""}`}>
            {s || "Tümü"}
          </button>
        ))}
      </div>

      {loadError && <p role="alert" style={{ marginBottom: 16, color: "var(--dn)", fontSize: 13 }}>{loadError}</p>}

      {selected.size > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, padding: "10px 14px", background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--ink2)" }}>{selected.size} seçili</span>
          <BulkBtn disabled={bulkPending} onClick={() => bulkAction("publish")} color="var(--up)">Yayınla</BulkBtn>
          <BulkBtn disabled={bulkPending} onClick={() => bulkAction("draft")} color="#d97706">Taslak</BulkBtn>
          <BulkBtn disabled={bulkPending} onClick={() => bulkAction("archive")} color="var(--muted)">Arşivle</BulkBtn>
          <BulkBtn disabled={bulkPending} onClick={() => bulkAction("delete")} color="var(--dn)">Sil</BulkBtn>
          {bulkPending && <span role="status" style={{ fontSize: 12, color: "var(--muted)" }}>İşlem sürüyor…</span>}
        </div>
      )}

      {loading ? <p style={{ color: "var(--muted)" }}>Yükleniyor...</p> : (
        <div className="adm-card"><div className="adm-card-b">
        <table className="adm-table">
          <thead>
            <tr>
              <th style={{ width: 30 }}>
                <input type="checkbox" checked={selected.size === articles.length && articles.length > 0} onChange={selectAll} />
              </th>
              <th>Başlık</th>
              <th>Kategori</th>
              <th>Kaynak</th>
              <th>SEO</th>
              <th>Durum</th>
              <th style={{ textAlign: "right" }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {articles.map(a => (
              <tr key={a.id} style={{ background: selected.has(a.id) ? "var(--accent-soft)" : undefined }}>
                <td>
                  <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleSelect(a.id)} />
                </td>
                <td style={{ maxWidth: 300 }}>
                  <Link href={`/sys-k3m8p/makaleler/${a.id}`} style={{ color: "var(--ink)" }}>
                    {a.title.slice(0, 55)}{a.title.length > 55 ? "..." : ""}
                  </Link>
                  {a.duplicateOf && <span style={{ marginLeft: 8, fontSize: 10, color: "var(--dn)" }}>DUP</span>}
                </td>
                <td style={{ color: "var(--muted)" }}>{a.category}</td>
                <td style={{ color: a.articleSource === "BOT" ? "var(--accent)" : "var(--ink2)", fontSize: 10 }}>{a.articleSource === "BOT" ? "Otomatik" : "Manuel"}</td>
                <td>
                  <span style={{ fontFamily: "var(--mono)", color: (a.seoScore || 0) >= 70 ? "var(--up)" : (a.seoScore || 0) >= 60 ? "#d97706" : "var(--dn)" }}>
                    {a.seoScore ?? "-"}
                  </span>
                  {a.seoScore != null && a.seoScore < 60 && a.status === "PUBLISHED" && (
                    <span title="Yayında ama SEO skoru düşük" style={{ marginLeft: 6, fontSize: 9, color: "var(--dn)", background: "var(--dn-soft)", border: "1px solid var(--dn)", borderRadius: 3, padding: "1px 4px" }}>
                      DÜŞÜK
                    </span>
                  )}
                </td>
                <td><span style={{ color: STATUS_COLORS[a.status] || "var(--muted)", fontSize: 11, fontFamily: "var(--mono)" }}>{a.status}</span></td>
                <td style={{ textAlign: "right" }}>
                  <Link href={`/${a.slug}`} target="_blank" style={{ marginRight: 8, fontSize: 10, color: "var(--muted)" }}>Önizle</Link>
                  <Link href={`/sys-k3m8p/makaleler/${a.id}`} style={{ fontSize: 10, color: "var(--accent)" }}>Düzenle</Link>
                  <button
                    onClick={() => deleteArticle(a.id, a.title)}
                    style={{ marginLeft: 8, fontSize: 10, color: "var(--dn)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}
                  >
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div></div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "center" }}>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="adm-btn">
          ← Önceki
        </button>
        <span style={{ padding: "6px 12px", fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>Sayfa {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={articles.length < 20} className="adm-btn">
          Sonraki →
        </button>
      </div>
    </div>
  );
}

function BulkBtn({ onClick, color, children, disabled = false }: { onClick: () => void; color: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick} style={{ padding: "5px 10px", fontSize: 11, border: `1px solid ${color}`, background: "transparent", color, borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer", fontWeight: 600, opacity: disabled ? 0.6 : 1 }}>
      {children}
    </button>
  );
}
