"use client";
import { useEffect, useState } from "react";

interface TopArticle {
  path: string;
  views: number;
  title: string;
  category: string | null;
}

interface Stats {
  totalViews: number;
  topPages: { path: string; views: number }[];
  topArticles: TopArticle[];
  daily: { date: string; count: number }[];
}

function isStats(value: unknown): value is Stats {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as Partial<Stats>;
  return Number.isFinite(data.totalViews)
    && Array.isArray(data.topPages)
    && data.topPages.every((row) => row
      && typeof row.path === "string"
      && Number.isFinite(row.views))
    && Array.isArray(data.topArticles)
    && data.topArticles.every((row) => row
      && typeof row.path === "string"
      && Number.isFinite(row.views)
      && typeof row.title === "string"
      && (row.category === null || typeof row.category === "string"))
    && Array.isArray(data.daily)
    && data.daily.every((row) => row
      && typeof row.date === "string"
      && Number.isFinite(row.count));
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [period, setPeriod] = useState("7d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- re-fetch sırasında loading göstergesi (kasıtlı)
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/stats?period=${period}`, { signal: controller.signal });
        if (response.status === 401) {
          throw new Error("Oturum süreniz dolmuş olabilir. Yeniden giriş yapın.");
        }
        if (!response.ok) throw new Error("Analitik verileri şu anda alınamıyor.");
        const data: unknown = await response.json();
        if (!isStats(data)) throw new Error("Analitik yanıtı beklenen biçimde değil.");
        setStats(data);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Analitik verileri şu anda alınamıyor.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [period]);

  if (loading) return <p style={{ color: "var(--muted)" }}>Yükleniyor...</p>;
  if (error || !stats) {
    return (
      <p role="alert" style={{ color: "var(--dn, #dc2626)" }}>
        {error ?? "Analitik verileri şu anda alınamıyor."} {" "}
        <a href="/sys-k3m8p/giris" style={{ color: "inherit", textDecoration: "underline" }}>Yönetim paneline giriş</a>
      </p>
    );
  }

  const maxDaily = Math.max(...stats.daily.map(d => d.count), 1);

  return (
    <div>
      <div className="adm-page-head">
        <h1 className="adm-h1">Analytics</h1>
        <div style={{ display: "flex", gap: 6 }}>
          {["24h", "7d", "30d"].map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`adm-pill${period === p ? " on" : ""}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="adm-stat" style={{ marginBottom: 22, padding: 24 }}>
        <div className="k">Toplam Sayfa Görüntüleme</div>
        <div className="v" style={{ fontSize: 36, marginTop: 10 }}>{stats.totalViews.toLocaleString("tr-TR")}</div>
      </div>

      {stats.daily.length > 0 && (
        <div className="adm-card"><div className="adm-card-b">
          <p className="adm-label" style={{ marginBottom: 16 }}>Günlük Trafik</p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 120 }}>
            {stats.daily.map(d => (
              <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", background: "var(--accent)", borderRadius: 3, height: `${(d.count / maxDaily) * 100}%`, minHeight: 2 }} />
                <span style={{ fontSize: 8, color: "var(--muted)", transform: "rotate(-45deg)", whiteSpace: "nowrap" }}>
                  {d.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </div></div>
      )}

      {stats.topArticles && stats.topArticles.length > 0 && (
        <div className="adm-card"><div className="adm-card-b">
          <p className="adm-label" style={{ marginBottom: 16 }}>En Çok Okunan Makaleler</p>
          <table className="adm-table">
            <tbody>
              {stats.topArticles.map((a, i) => (
                <tr key={a.path}>
                  <td style={{ color: "var(--faint)", width: 30, fontFamily: "var(--mono)" }}>{i + 1}</td>
                  <td>
                    <span style={{ color: "var(--ink)" }}>{a.title.slice(0, 60)}{a.title.length > 60 ? "..." : ""}</span>
                    {a.category && <span style={{ marginLeft: 8, fontSize: 10, color: "var(--muted)", background: "var(--surface)", padding: "2px 6px", borderRadius: 3, fontFamily: "var(--mono)" }}>{a.category}</span>}
                  </td>
                  <td style={{ color: "var(--accent)", textAlign: "right", fontWeight: 600, fontFamily: "var(--mono)" }}>{a.views.toLocaleString("tr-TR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      )}

      <div className="adm-card"><div className="adm-card-b">
        <p className="adm-label" style={{ marginBottom: 16 }}>Tüm Sayfa Görüntülemeleri</p>
        <table className="adm-table">
          <tbody>
            {stats.topPages.map((p, i) => (
              <tr key={p.path}>
                <td style={{ color: "var(--faint)", width: 30, fontFamily: "var(--mono)" }}>{i + 1}</td>
                <td style={{ color: "var(--ink2)" }}>{p.path}</td>
                <td style={{ color: "var(--accent)", textAlign: "right", fontWeight: 600, fontFamily: "var(--mono)" }}>{p.views}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div>
    </div>
  );
}
