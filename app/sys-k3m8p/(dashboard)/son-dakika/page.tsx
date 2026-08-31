"use client";
import { useEffect, useState } from "react";
import Select from "@/components/Select";

interface BN {
  id: string;
  text: string;
  url?: string | null;
  active: boolean;
  live?: boolean;
  createdAt: string;
  expiresAt?: string | null;
}

const TTL_OPTIONS = [1, 3, 6, 12, 24];

export default function BreakingNewsAdmin() {
  const [items, setItems] = useState<BN[]>([]);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [ttlHours, setTtlHours] = useState(6);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/admin/breaking-news")
      .then(r => r.json())
      .then(d => {
        setItems(d.items || []);
        if (typeof d.defaultTtlHours === "number") setTtlHours(d.defaultTtlHours);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function create() {
    setError("");
    if (!text.trim()) return;
    const res = await fetch("/api/admin/breaking-news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, url: url || null, ttlHours }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Yayınlanamadı");
      return;
    }
    setText("");
    setUrl("");
    load();
  }

  async function deactivateAll() {
    await fetch("/api/admin/breaking-news", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setItems(prev => prev.map(i => ({ ...i, active: false, live: false })));
  }

  async function remove(id: string) {
    await fetch("/api/admin/breaking-news", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems(prev => prev.filter(i => i.id !== id));
  }

  if (loading) return <p style={{ color: "var(--muted)" }}>Yükleniyor...</p>;

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 className="adm-h1" style={{ marginBottom: 8 }}>Son Dakika</h1>
      <p className="adm-lead">
        Aktif son dakika haberi sitenin en üstünde banner olarak görünür. Süre dolunca otomatik kapanır.
      </p>

      <div className="adm-card">
        <div className="adm-card-h"><div><b>Yeni Son Dakika</b><small>Manşet üstü uyarı bandı yayınla</small></div></div>
        <div className="adm-card-b">
        <input value={text} onChange={e => setText(e.target.value)} maxLength={280} placeholder="Son dakika metni..."
          className="adm-input" style={{ marginBottom: 8 }} />
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Link (opsiyonel, http/https)"
          className="adm-input" style={{ marginBottom: 12, fontSize: 12 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>Geçerlilik süresi:</label>
          <Select
            className="sel-adm"
            value={String(ttlHours)}
            onChange={value => setTtlHours(parseInt(value))}
            options={TTL_OPTIONS.map(h => ({ value: String(h), label: `${h} saat` }))}
            ariaLabel="Yayında kalma süresi"
          />
        </div>
        {error && <p style={{ fontSize: 12, color: "var(--dn)", marginBottom: 10 }}>{error}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={create} className="adm-btn adm-btn-primary">
            Yayınla
          </button>
          <button onClick={deactivateAll} className="adm-btn">
            Tümünü Kapat
          </button>
        </div>
        </div>
      </div>

      {items.map(item => {
        const isLive = item.live ?? item.active;
        return (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: isLive ? "var(--up)" : "var(--surface3)", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, color: isLive ? "var(--ink)" : "var(--muted)" }}>{item.text}</p>
              <p style={{ fontSize: 10, color: "var(--faint)", marginTop: 2, fontFamily: "var(--mono)" }}>
                {new Date(item.createdAt).toLocaleString("tr-TR")}
                {item.expiresAt && (
                  <span style={{ marginLeft: 8 }}>
                    · {isLive ? "Bitiş" : "Bitti"}: {new Date(item.expiresAt).toLocaleString("tr-TR")}
                  </span>
                )}
              </p>
            </div>
            <button onClick={() => remove(item.id)}
              style={{ fontSize: 10, color: "var(--dn)", background: "none", border: "none", cursor: "pointer" }}>Sil</button>
          </div>
        );
      })}
    </div>
  );
}
