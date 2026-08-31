"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Select from "@/components/Select";

const RichEditor = dynamic(() => import("@/components/RichEditor"), { ssr: false });

export default function NewArticle() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", meta: "", keyword: "", category: "kripto", content: "", imageUrl: "", source: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error + (data.score ? ` (Benzerlik: ${Math.round(data.score * 100)}%)` : ""));
      setSaving(false);
      return;
    }
    router.push(`/sys-k3m8p/makaleler/${data.article.id}`);
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 className="adm-h1" style={{ marginBottom: 22 }}>Yeni Makale</h1>
      {error && <div style={{ padding: 12, background: "var(--dn-soft)", border: "1px solid var(--dn)", borderRadius: 8, marginBottom: 16, color: "var(--dn)", fontSize: 13 }}>{error}</div>}

      <form onSubmit={submit}>
        <div className="adm-card"><div className="adm-card-b">
        <Field label="Başlık" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} required />
        <Field label="Meta Açıklama" value={form.meta} onChange={v => setForm(f => ({ ...f, meta: v }))} required />
        <Field label="Anahtar Kelime" value={form.keyword} onChange={v => setForm(f => ({ ...f, keyword: v }))} />
        <Field label="Kaynak" value={form.source} onChange={v => setForm(f => ({ ...f, source: v }))} />

        <label style={{ display: "block", marginBottom: 16 }}>
          <span className="adm-label">Kategori</span>
          <Select
            className="sel-adm"
            value={form.category}
            onChange={value => setForm(f => ({ ...f, category: value }))}
            options={["kripto", "borsa", "doviz", "altin", "ekonomi"].map(c => ({ value: c, label: c }))}
            ariaLabel="Kategori"
          />
        </label>

        <Field label="Görsel URL" value={form.imageUrl} onChange={v => setForm(f => ({ ...f, imageUrl: v }))} />

        <label style={{ display: "block", marginBottom: 16 }}>
          <span className="adm-label">İçerik</span>
          <RichEditor content={form.content} onChange={v => setForm(f => ({ ...f, content: v }))} />
        </label>
        </div></div>

        <button type="submit" disabled={saving} className="adm-btn adm-btn-primary" style={{ padding: "12px 28px" }}>
          {saving ? "Kaydediliyor..." : "Oluştur"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label style={{ display: "block", marginBottom: 16 }}>
      <span className="adm-label">{label}</span>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} required={required} className="adm-input" />
    </label>
  );
}
