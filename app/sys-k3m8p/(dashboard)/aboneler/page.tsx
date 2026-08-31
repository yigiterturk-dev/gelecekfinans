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

export default function SubscribersPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [total, setTotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const fetchSubs = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/subscribers?filter=${filter}`)
      .then(r => r.json())
      .then(d => { setSubs(d.subscribers || []); setTotal(d.total); setActiveCount(d.activeCount); setConfirmedCount(d.confirmedCount || 0); })
      .finally(() => setLoading(false));
  }, [filter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/filtre değişiminde veri çek (kasıtlı)
  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  async function toggleSub(id: string, active: boolean) {
    await fetch(`/api/admin/subscribers`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    fetchSubs();
  }

  async function deleteSub(id: string) {
    if (!confirm("Bu aboneyi silmek istediğine emin misin?")) return;
    await fetch(`/api/admin/subscribers`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchSubs();
  }

  async function exportCsv() {
    const csv = ["email,active,confirmed,preferences,source,createdAt", ...subs.map(s => `${s.email},${s.active},${s.confirmed ?? ""},${(s.preferences || []).join("|")},${s.source ?? ""},${s.createdAt}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "aboneler.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="adm-page-head">
        <h1 className="adm-h1">
          Aboneler <span className="adm-count">({activeCount} aktif / {confirmedCount} onaylı / {total} toplam)</span>
        </h1>
        <button onClick={exportCsv} className="adm-btn">
          CSV İndir
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
                <td style={{ color: "var(--muted)", fontSize: 12, fontFamily: "var(--mono)" }}>{new Date(s.createdAt).toLocaleDateString("tr-TR")}</td>
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

      {!loading && subs.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 12 }}>Abone bulunamadı.</p>}
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
      const d = await res.json();
      if (!res.ok) { setResult(d.error || "Gönderim başarısız."); }
      else if (d.sent === 0 || (d.sentA === 0 && d.sentB === 0)) {
        setResult(`Gönderilmedi (${d.reason || (d.mailEnabled === false ? "RESEND_API_KEY yok — log/no-op" : "bilinmeyen")}). Alıcı: ${d.recipients ?? 0}`);
      } else {
        setResult(`Gönderildi → A: ${d.recipientsA} alıcı, B: ${d.recipientsB} alıcı (kampanya ${d.campaignId}).`);
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
        <button onClick={send} disabled={sending} className="adm-btn adm-btn-primary">
          {sending ? "Gönderiliyor..." : "Gönder"}
        </button>
        {result && <span style={{ fontSize: 12, color: "var(--ink2)" }}>{result}</span>}
      </div>
      <p style={{ fontSize: 10, color: "var(--muted)", marginTop: 8 }}>
        Yalnızca onaylı + aktif aboneler hedeflenir. Son 24 saatte yayımlanan
        {segment ? ` ${segment}` : ""} makaleleri kullanılır. RESEND_API_KEY yoksa gönderim no-op (loglanır).
      </p>
      </div>
    </div>
  );
}
