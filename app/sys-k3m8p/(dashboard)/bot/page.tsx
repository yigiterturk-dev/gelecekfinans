"use client";
import { useEffect, useState } from "react";

interface Topic {
  title: string;
  summary: string;
  category: string;
  source: string;
  imageUrl?: string;
}

interface BotRun {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  articlesFound: number;
  articlesAdded: number;
  duplicatesSkipped: number;
  autoPublished: number;
  reviewQueued: number;
  blocked: number;
  imageFallbacks: number;
  errors: string | null;
  status: string;
}

interface DecisionRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  riskLevel: "GREEN" | "YELLOW" | "RED";
  publicationDecision: "AUTO_PUBLISH" | "REVIEW" | "BLOCK";
  sourceScore: number | null;
  seoScore: number | null;
  imageStrategy: string | null;
  createdAt: string;
}

const CATEGORIES = [
  { value: "", label: "Tümü" },
  { value: "kripto", label: "Kripto" },
  { value: "borsa", label: "Borsa" },
  { value: "doviz", label: "Döviz" },
  { value: "altin", label: "Altın" },
  { value: "ekonomi", label: "Ekonomi" },
];

export default function BotPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [runs, setRuns] = useState<BotRun[]>([]);
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [category, setCategory] = useState("");
  const [count, setCount] = useState(3);
  const [result, setResult] = useState<string | null>(null);
  const [autoPublish, setAutoPublish] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/bot/topics").then((r) => r.json()),
      fetch("/api/admin/bot-runs").then((r) => r.json()),
    ])
      .then(([t, r]) => {
        setTopics(t.topics || []);
        setRuns(r.runs || []);
        setDecisions(r.recentDecisions || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const loadTopics = async (cat: string) => {
    setCategory(cat);
    const res = await fetch(`/api/bot/topics?category=${cat}`);
    const data = await res.json();
    setTopics(data.topics || []);
  };

  const generate = async () => {
    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch("/api/bot/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, category, words: 1000, autoPublish }),
      });
      const data = await res.json();
      if (data.error) {
        setResult(`Hata: ${data.error}`);
      } else {
        setResult(
          `${data.added} makale oluşturuldu · ${data.autoPublished} otomatik yayında · ${data.reviewQueued} incelemede · ${data.duplicatesSkipped} benzer içerik atlandı` +
            (data.errors?.length ? `, ${data.errors.length} hata` : "")
        );
      }
      const runsRes = await fetch("/api/admin/bot-runs");
      const runsData = await runsRes.json();
      setRuns(runsData.runs || []);
      setDecisions(runsData.recentDecisions || []);
    } catch (e) {
      setResult(`Hata: ${(e as Error).message}`);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <p style={{ color: "var(--muted)" }}>Yükleniyor...</p>;

  return (
    <div>
      <div className="adm-page-head"><h1 className="adm-h1">Otonom Yayın Merkezi</h1></div>

      <div className="adm-card">
        <div className="adm-card-h"><div><b>Yayın Akışını Çalıştır</b><small>Kaynak → içerik → görsel → kalite kapısı → yayın kararı</small></div></div>
        <div className="adm-card-b">
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label className="adm-label">Kategori</label>
            <select value={category} onChange={(e) => loadTopics(e.target.value)} className="adm-select" style={{ width: "auto" }}>
              {CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
            </select>
          </div>
          <div>
            <label className="adm-label">Adet</label>
            <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="adm-select" style={{ width: "auto" }}>
              {[1, 2, 3, 5, 10].map((n) => (<option key={n} value={n}>{n} makale</option>))}
            </select>
          </div>
          <button onClick={generate} disabled={generating} className="adm-btn adm-btn-primary">
            {generating ? "Akış çalışıyor..." : "Akışı Başlat"}
          </button>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, color: "var(--ink2)", fontSize: 13 }}>
          <input type="checkbox" checked={autoPublish} onChange={(e) => setAutoPublish(e.target.checked)} />
          Eşikleri geçen yeşil içerikleri otomatik yayımla
        </label>
        <p style={{ marginTop: 6, fontSize: 11, color: "var(--muted)" }}>
          Kapalıyken tüm içerikler denetim için taslakta kalır. Hassas içerikler bu seçenek açık olsa da otomatik yayımlanmaz.
        </p>
        {result && (
          <div style={{ marginTop: 16, padding: "10px 14px", background: "var(--surface)", borderRadius: 8, fontSize: 13, color: result.startsWith("Hata") ? "var(--dn)" : "var(--up)" }}>
            {result}
          </div>
        )}
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-h"><div><b>Son Yayın Kararları</b><small>Karar motorunun son 20 içerik için verdiği sonuç</small></div></div>
        <div className="adm-card-b">
          {decisions.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13 }}>Henüz karar kaydı yok</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {decisions.map((item) => (
                <div key={item.id} style={{ padding: 14, border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: "var(--ink)", fontSize: 13, fontWeight: 600 }}>{item.title}</p>
                      <p style={{ color: "var(--muted)", fontSize: 11, marginTop: 5 }}>
                        Kaynak {item.sourceScore ?? "—"}/100 · SEO {item.seoScore ?? "—"}/100 · {item.imageStrategy || "görsel bekliyor"}
                      </p>
                    </div>
                    <span style={{
                      whiteSpace: "nowrap", fontSize: 10, padding: "4px 8px", borderRadius: 5,
                      background: item.publicationDecision === "AUTO_PUBLISH" ? "var(--up-soft)" : item.riskLevel === "RED" ? "#fef2f2" : "#fffbeb",
                      color: item.publicationDecision === "AUTO_PUBLISH" ? "var(--up)" : item.riskLevel === "RED" ? "var(--dn)" : "#b45309",
                    }}>
                      {item.publicationDecision === "AUTO_PUBLISH" ? "YAYINLANDI" : item.riskLevel === "RED" ? "HASSAS · İNCELE" : "İNCELE"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-h"><div><b>Güncel Konular</b><small>{topics.length} başlık bulundu</small></div></div>
        <div className="adm-card-b">
        {topics.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 13 }}>Konu bulunamadı</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {topics.slice(0, 15).map((t, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--surface)", borderRadius: 8, gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: "var(--ink2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</p>
                  <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{t.source}</p>
                </div>
                <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "var(--surface2)", color: "var(--ink2)", whiteSpace: "nowrap", fontFamily: "var(--mono)" }}>{t.category}</span>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-h"><div><b>Çalışma Geçmişi</b><small>Son bot çalıştırma kayıtları</small></div></div>
        <div className="adm-card-b">
        {runs.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 13 }}>Henüz çalışma yok</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {runs.map((r) => (
              <div key={r.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: "var(--ink2)", fontFamily: "var(--mono)" }}>{new Date(r.startedAt).toLocaleString("tr-TR")}</span>
                  <span style={{ fontSize: 11, padding: "4px 8px", borderRadius: 4, fontFamily: "var(--mono)", background: r.status === "completed" ? "var(--up-soft)" : "#fffbeb", color: r.status === "completed" ? "var(--up)" : "#d97706" }}>
                    {r.status}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 12 }}>
                  <Stat label="Bulunan" value={r.articlesFound} />
                  <Stat label="Eklenen" value={r.articlesAdded} color="var(--up)" />
                  <Stat label="Yayında" value={r.autoPublished} color="var(--up)" />
                  <Stat label="İncelemede" value={r.reviewQueued} color="#d97706" />
                  <Stat label="Duplicate" value={r.duplicatesSkipped} color="#d97706" />
                </div>
                {r.errors && (
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ fontSize: 11, color: "var(--dn)", cursor: "pointer" }}>Hatalar</summary>
                    <pre style={{ fontSize: 11, color: "var(--dn)", marginTop: 8, whiteSpace: "pre-wrap" }}>{r.errors}</pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase" }}>{label}</p>
      <p style={{ fontFamily: "var(--display)", fontSize: 20, fontWeight: 700, color: color || "var(--ink)" }}>{value}</p>
    </div>
  );
}
