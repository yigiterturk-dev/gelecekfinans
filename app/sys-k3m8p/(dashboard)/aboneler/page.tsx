"use client";
import { useEffect, useState, useCallback } from "react";
import Select from "@/components/Select";

interface Sub {
  id: string;
  email: string;
  active: boolean;
  confirmed?: boolean;
  preferences?: string[];
  source?: string | null;
  createdAt: string;
}

const SEGMENTS = ["kripto", "borsa", "doviz", "altin", "ekonomi"];

function csvCell(value: string | number | boolean) {
  const text = String(value);
  const safeText = /^[\s\uFEFF]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

function isSubscriber(value: unknown): value is Sub {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "string"
    && typeof row.email === "string"
    && typeof row.active === "boolean"
    && (row.confirmed === undefined || typeof row.confirmed === "boolean")
    && (row.preferences === undefined || (Array.isArray(row.preferences) && row.preferences.every((item) => typeof item === "string")))
    && (row.source === undefined || row.source === null || typeof row.source === "string")
    && typeof row.createdAt === "string";
}

export default function SubscribersPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [total, setTotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const fetchSubs = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`/api/admin/subscribers?filter=${filter}`, { signal });
      if (response.status === 401) throw new Error("Oturum süreniz dolmuş olabilir. Yeniden giriş yapın.");
      if (!response.ok) throw new Error("Abone listesi şu anda alınamıyor.");
      const data: unknown = await response.json();
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Abone yanıtı geçersiz.");
      const result = data as Record<string, unknown>;
      if (!Array.isArray(result.subscribers) || !result.subscribers.every(isSubscriber)
        || !Number.isFinite(result.total)
        || !Number.isFinite(result.activeCount)
        || !Number.isFinite(result.confirmedCount)) {
        throw new Error("Abone yanıtı beklenen biçimde değil.");
      }
      setSubs(result.subscribers as Sub[]);
      setTotal(result.total as number);
      setActiveCount(result.activeCount as number);
      setConfirmedCount(result.confirmedCount as number);
    } catch (cause) {
      if (signal?.aborted) return;
      setLoadError(cause instanceof Error ? cause.message : "Abone listesi şu anda alınamıyor.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [filter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/filtre değişiminde veri çek (kasıtlı)
  useEffect(() => {
    const controller = new AbortController();
    void fetchSubs(controller.signal);
    return () => controller.abort();
  }, [fetchSubs]);

  async function toggleSub(id: string, active: boolean) {
    setActionError(null);
    try {
      const response = await fetch(`/api/admin/subscribers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: !active }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Abone durumu değiştirilemedi.");
      await fetchSubs();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Abone durumu değiştirilemedi.");
    }
  }

  async function deleteSub(id: string) {
    if (!confirm("Bu aboneyi silmek istediğine emin misin?")) return;
    setActionError(null);
    try {
      const response = await fetch(`/api/admin/subscribers`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Abone silinemedi.");
      await fetchSubs();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Abone silinemedi.");
    }
  }

  async function exportCsv() {
    if (exporting) return;
    setExporting(true);
    setActionError(null);
    try {
      const pageSize = 1000;
      let cursor: string | null = null;
      const allSubscribers: Sub[] = [];
      while (true) {
        const params = new URLSearchParams({ filter, take: String(pageSize) });
        if (cursor) params.set("cursor", cursor);
        const response = await fetch(`/api/admin/subscribers?${params}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Abone kayıtları dışa aktarma için alınamadı.");
        const data: unknown = await response.json().catch(() => null);
        if (!data || typeof data !== "object" || Array.isArray(data)
          || !Array.isArray((data as Record<string, unknown>).subscribers)
          || !((data as Record<string, unknown>).subscribers as unknown[]).every(isSubscriber)) {
          throw new Error("Sunucudan geçersiz abone verisi geldi.");
        }
        const batch = (data as { subscribers: Sub[] }).subscribers;
        allSubscribers.push(...batch);
        if (batch.length < pageSize) break;
        const nextCursor = (data as Record<string, unknown>).nextCursor;
        if (!nextCursor || typeof nextCursor !== "object" || Array.isArray(nextCursor)
          || typeof (nextCursor as Record<string, unknown>).id !== "string"
          || typeof (nextCursor as Record<string, unknown>).createdAt !== "string") {
          throw new Error("Sunucu dışa aktarma sayfalama imlecini döndürmedi.");
        }
        cursor = JSON.stringify(nextCursor);
      }

      const headers = ["email", "active", "confirmed", "preferences", "source", "createdAt"];
      const rows = allSubscribers.map((subscriber) => [
        subscriber.email,
        subscriber.active,
        subscriber.confirmed ?? "",
        (subscriber.preferences || []).join("|"),
        subscriber.source ?? "",
        subscriber.createdAt,
      ]);
      const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
      const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "aboneler.csv"; a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "CSV dışa aktarma tamamlanamadı.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="adm-page-head">
        <h1 className="adm-h1">
          Aboneler <span className="adm-count">({activeCount} aktif / {confirmedCount} onaylı / {total} toplam)</span>
        </h1>
        <button onClick={() => void exportCsv()} disabled={exporting} aria-busy={exporting} className="adm-btn">
          <span role={exporting ? "status" : undefined}>{exporting ? "CSV hazırlanıyor…" : "CSV İndir"}</span>
        </button>
      </div>

      <CampaignSender />

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["all", "active", "inactive"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`adm-pill${filter === f ? " on" : ""}`}>
            {f === "all" ? "Tümü" : f === "active" ? "Aktif" : "Pasif"}
          </button>
        ))}
      </div>

      {actionError && <p role="alert" style={{ color: "var(--dn, #dc2626)" }}>{actionError}</p>}
      {loadError && (
        <p role="alert" style={{ color: "var(--dn, #dc2626)" }}>
          {loadError}{" "}
          <button type="button" className="adm-btn" onClick={() => void fetchSubs()}>Yeniden dene</button>{" "}
          <a href="/sys-k3m8p/giris" style={{ color: "inherit", textDecoration: "underline" }}>Yönetim paneline giriş</a>
        </p>
      )}

      {loading ? <p style={{ color: "var(--muted)" }}>Yükleniyor...</p> : (
        <div className="adm-card"><div className="adm-card-b">
        <table className="adm-table">
          <thead>
            <tr>
              <th>E-posta</th>
              <th>Tercihler</th>
              <th>Durum</th>
              <th>Kayıt Tarihi</th>
              <th style={{ textAlign: "right" }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {subs.map(s => (
              <tr key={s.id}>
                <td style={{ color: "var(--ink)" }}>{s.email}</td>
                <td style={{ color: "var(--ink2)", fontSize: 11 }}>
                  {s.preferences && s.preferences.length > 0 ? s.preferences.join(", ") : "Tümü"}
                </td>
                <td>
                  <span style={{ fontSize: 11, color: s.active ? "var(--up)" : "var(--muted)" }}>
                    {s.active ? "Aktif" : "Pasif"}
                  </span>
                  {s.confirmed === false && (
                    <span style={{ fontSize: 9, color: "#d97706", marginLeft: 6 }}>(onaysız)</span>
                  )}
                </td>
                <td style={{ color: "var(--muted)", fontSize: 12, fontFamily: "var(--mono)" }}>{new Date(s.createdAt).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}</td>
                <td style={{ textAlign: "right" }}>
                  <button onClick={() => toggleSub(s.id, s.active)}
                    style={{ fontSize: 10, color: s.active ? "#d97706" : "var(--up)", background: "none", border: "none", cursor: "pointer", marginRight: 8 }}>
                    {s.active ? "Pasifleştir" : "Aktifleştir"}
                  </button>
                  <button onClick={() => deleteSub(s.id)}
                    style={{ fontSize: 10, color: "var(--dn)", background: "none", border: "none", cursor: "pointer" }}>
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div></div>
      )}

      {!loading && !loadError && subs.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 12 }}>Abone bulunamadı.</p>}
    </div>
  );
}

function CampaignSender() {
  const [segment, setSegment] = useState("");
  const [subjectA, setSubjectA] = useState("");
  const [subjectB, setSubjectB] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function send() {
    if (!subjectA.trim()) { setResult("Konu satırı (A) zorunlu."); return; }
    if (!confirm("Bültüni şimdi göndermek istediğine emin misin?")) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segment: segment || undefined, subjectA, subjectB: subjectB || undefined }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        setResult(d && typeof d === "object" && typeof d.error === "string" ? d.error : "Gönderim başarısız.");
      }
      else if (!d || typeof d !== "object") {
        setResult("Sunucudan geçersiz gönderim sonucu geldi.");
      } else if (d.sent === 0 || (d.sentA === 0 && d.sentB === 0)) {
        setResult(`Gönderilmedi (${d.reason || (d.mailEnabled === false ? "mail yapılandırması eksik" : "gönderilebilen e-posta yok")}). Alıcı: ${d.recipients ?? 0}, uygun makale: ${d.availableArticles ?? "—"}`);
      } else if (![d.sentA, d.sentB, d.recipientsA, d.recipientsB].every(Number.isSafeInteger)) {
        setResult("Sunucudan geçersiz gönderim sayıları geldi.");
      } else {
        const partial = d.sentA < d.recipientsA || d.sentB < d.recipientsB;
        setResult(`${partial ? "Kısmi gönderim" : "Gönderildi"} → A: ${d.sentA}/${d.recipientsA}, B: ${d.sentB}/${d.recipientsB} (kampanya ${d.campaignId}).`);
      }
    } catch {
      setResult("Bir hata oluştu.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="adm-card">
      <div className="adm-card-h"><div><b>Segment + A/B Bülten Gönder</b><small>Onaylı + aktif abonelere kampanya gönder</small></div></div>
      <div className="adm-card-b">
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr", gap: 10, alignItems: "end" }}>
        <div>
          <label className="adm-label">Segment</label>
          <Select
            className="sel-adm"
            value={segment}
            onChange={setSegment}
            options={[{ value: "", label: "Tüm aboneler" }, ...SEGMENTS.map(s => ({ value: s, label: s }))]}
            ariaLabel="Abone segmenti"
          />
        </div>
        <div>
          <label className="adm-label">Konu A</label>
          <input value={subjectA} onChange={e => setSubjectA(e.target.value)} maxLength={150}
            placeholder="Günlük bülten — konu satırı" className="adm-input" />
        </div>
        <div>
          <label className="adm-label">Konu B (A/B testi — opsiyonel)</label>
          <input value={subjectB} onChange={e => setSubjectB(e.target.value)} maxLength={150}
            placeholder="Alternatif konu satırı" className="adm-input" />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
        <button onClick={send} disabled={sending} aria-busy={sending} className="adm-btn adm-btn-primary">
          {sending ? "Gönderiliyor..." : "Gönder"}
        </button>
        {result && <span role="status" aria-live="polite" aria-atomic="true" style={{ fontSize: 12, color: "var(--ink2)" }}>{result}</span>}
      </div>
      <p style={{ fontSize: 10, color: "var(--muted)", marginTop: 8 }}>
        Yalnızca onaylı + aktif aboneler hedeflenir. Son 24 saatte yayımlanan
        {segment ? ` ${segment}` : ""} makaleleri kullanılır. RESEND_API_KEY yoksa gönderim no-op (loglanır).
      </p>
      </div>
    </div>
  );
}
