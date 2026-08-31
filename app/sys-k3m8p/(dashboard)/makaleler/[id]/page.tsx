"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { SEO_PUBLISH_THRESHOLD } from "@/lib/seo";
import Select from "@/components/Select";

const RichEditor = dynamic(() => import("@/components/RichEditor"), { ssr: false });

interface SeoResult { score: number; issues: string[]; passed: string[]; }

export default function EditArticle() {
  const { id } = useParams();
  const router = useRouter();
  const [form, setForm] = useState({ title: "", meta: "", keyword: "", category: "", content: "", imageUrl: "", status: "", premium: false });
  const [seo, setSeo] = useState<SeoResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/admin/articles/${id}`)
      .then(r => r.json())
      .then(d => {
        const a = d.article;
        setForm({ title: a.title, meta: a.meta, keyword: a.keyword || "", category: a.category, content: a.content, imageUrl: a.imageUrl || "", status: a.status, premium: !!a.premium });
        setSeo(d.seo);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function save() {
    // Düşük SEO skorlu makaleyi yayınlamadan önce uyar.
    if (form.status === "PUBLISHED" && seo && seo.score < SEO_PUBLISH_THRESHOLD) {
      const ok = confirm(
        `SEO skoru düşük (${seo.score}/100, önerilen min ${SEO_PUBLISH_THRESHOLD}).\n` +
        `Yine de yayınlamak istiyor musun?`,
      );
      if (!ok) return;
    }
    setSaving(true);
    const res = await fetch(`/api/admin/articles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    setSeo(d.seo);
    setSaving(false);
  }

  // Seçilen görsel dosyasını Vercel Blob'a yükler, dönen URL'i form.imageUrl'e yazar.
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload-image", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) {
        alert(d.error || "Görsel yüklenemedi.");
      } else if (d.url) {
        setForm(f => ({ ...f, imageUrl: d.url }));
      }
    } catch {
      alert("Görsel yüklenirken bir hata oluştu.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; // aynı dosya tekrar seçilebilsin
    }
  }

  // Makaleyi kalıcı olarak siler; onay alır, başarılıysa listeye döner.
  async function remove() {
    if (!confirm("Bu makale kalıcı olarak silinecek. Emin misin?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/articles/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "Makale silinemedi.");
        setDeleting(false);
        return;
      }
      router.push("/sys-k3m8p/makaleler");
    } catch {
      alert("Makale silinirken bir hata oluştu.");
      setDeleting(false);
    }
  }

  if (loading) return <p style={{ color: "var(--muted)" }}>Yükleniyor...</p>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 32 }}>
      <div>
        <h1 className="adm-h1" style={{ marginBottom: 20, fontSize: 22 }}>Makale Düzenle</h1>

        <div className="adm-card"><div className="adm-card-b">
        <Field label="Başlık" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} />
        <Field label="Meta Açıklama" value={form.meta} onChange={v => setForm(f => ({ ...f, meta: v }))} />
        <Field label="Anahtar Kelime" value={form.keyword} onChange={v => setForm(f => ({ ...f, keyword: v }))} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label className="adm-label">Kategori</label>
            <Select
            className="sel-adm"
              value={form.category}
              onChange={value => setForm(f => ({ ...f, category: value }))}
              options={["kripto", "borsa", "doviz", "altin", "ekonomi"].map(c => ({ value: c, label: c }))}
              ariaLabel="Kategori"
            />
          </div>
          <div>
            <label className="adm-label">Durum</label>
            <Select
            className="sel-adm"
              value={form.status}
              onChange={value => setForm(f => ({ ...f, status: value }))}
              options={["DRAFT", "PUBLISHED", "REJECTED", "ARCHIVED"].map(s => ({ value: s, label: s }))}
              ariaLabel="Yayın durumu"
            />
          </div>
        </div>

        <Field label="Görsel URL" value={form.imageUrl} onChange={v => setForm(f => ({ ...f, imageUrl: v }))} />

        {/* Görsel önizleme + dosya yükleme (URL alanı da çalışmaya devam eder) */}
        <div style={{ marginBottom: 16 }}>
          {form.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- harici/blob görsel önizlemesi, optimize gerekmez
            <img
              src={form.imageUrl}
              alt="Görsel önizleme"
              style={{ maxWidth: 220, maxHeight: 140, borderRadius: 8, border: "1px solid var(--border)", marginBottom: 10, display: "block", objectFit: "cover" }}
            />
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: "none" }} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="adm-btn"
            style={{ fontSize: 12, padding: "6px 14px" }}
          >
            {uploading ? "Yükleniyor..." : form.imageUrl ? "Görseli Değiştir" : "Görsel Yükle"}
          </button>
          {form.imageUrl && (
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, imageUrl: "" }))}
              className="adm-btn"
              style={{ fontSize: 12, padding: "6px 14px", marginLeft: 8 }}
            >
              Görseli Kaldır
            </button>
          )}
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, cursor: "pointer" }}>
          <input type="checkbox" checked={form.premium} onChange={e => setForm(f => ({ ...f, premium: e.target.checked }))} />
          <span style={{ fontSize: 13, color: "var(--ink)" }}>Premium içerik (üye girişi gerektirir)</span>
        </label>

        <label className="adm-label">İçerik</label>
        <EditorTabs content={form.content} onChange={v => setForm(f => ({ ...f, content: v }))} />
        </div></div>

        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
          <button onClick={save} disabled={saving} className="adm-btn adm-btn-primary" style={{ padding: "10px 24px" }}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
          <button onClick={() => router.push("/sys-k3m8p/makaleler")} className="adm-btn" style={{ padding: "10px 24px" }}>
            Geri
          </button>
          {/* Tehlikeli işlem: makaleyi kalıcı sil (onaylı) */}
          <button
            onClick={remove}
            disabled={deleting}
            className="adm-btn"
            style={{ padding: "10px 24px", marginLeft: "auto", color: "var(--dn)", borderColor: "var(--dn)" }}
          >
            {deleting ? "Siliniyor..." : "Makaleyi Sil"}
          </button>
        </div>
      </div>

      <div className="adm-card" style={{ height: "fit-content", position: "sticky", top: 32 }}>
        <div className="adm-card-h"><div><b style={{ fontSize: 15 }}>SEO Skoru</b></div></div>
        <div className="adm-card-b">
        {seo && (
          <>
            <div style={{ fontFamily: "var(--display)", fontSize: 36, fontWeight: 700, color: seo.score >= 70 ? "var(--up)" : seo.score >= 50 ? "#d97706" : "var(--dn)", marginBottom: 16 }}>
              {seo.score}/100
            </div>
            {seo.issues.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p className="adm-label" style={{ color: "var(--dn)", marginBottom: 6 }}>SORUNLAR</p>
                {seo.issues.map((i, idx) => <p key={idx} style={{ fontSize: 12, color: "var(--dn)", marginBottom: 4 }}>• {i}</p>)}
              </div>
            )}
            {seo.passed.length > 0 && (
              <div>
                <p className="adm-label" style={{ color: "var(--up)", marginBottom: 6 }}>GEÇEN</p>
                {seo.passed.map((p, idx) => <p key={idx} style={{ fontSize: 12, color: "var(--up)", marginBottom: 4 }}>✓ {p}</p>)}
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: "block", marginBottom: 16 }}>
      <span className="adm-label">{label}</span>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} className="adm-input" />
    </label>
  );
}

function EditorTabs({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  const [mode, setMode] = useState<"visual" | "html">("visual");
  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        <button type="button" onClick={() => setMode("visual")} className={`adm-pill${mode === "visual" ? " on" : ""}`} style={{ fontSize: 10, padding: "4px 10px" }}>
          Görsel Editör
        </button>
        <button type="button" onClick={() => setMode("html")} className={`adm-pill${mode === "html" ? " on" : ""}`} style={{ fontSize: 10, padding: "4px 10px" }}>
          HTML
        </button>
      </div>
      {mode === "visual" ? (
        <RichEditor content={content} onChange={onChange} />
      ) : (
        <textarea value={content} onChange={e => onChange(e.target.value)} className="adm-textarea"
          style={{ minHeight: 400, fontFamily: "var(--mono)", fontSize: 13 }} />
      )}
    </div>
  );
}
