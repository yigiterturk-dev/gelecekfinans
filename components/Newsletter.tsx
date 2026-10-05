"use client";
import { useState } from "react";

const PREFS: { key: string; label: string }[] = [
  { key: "kripto", label: "Kripto" },
  { key: "borsa", label: "Borsa" },
  { key: "doviz", label: "Döviz" },
  { key: "altin", label: "Altın" },
  { key: "ekonomi", label: "Ekonomi" },
];

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [prefs, setPrefs] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [needsConfirm, setNeedsConfirm] = useState(false);

  function togglePref(key: string) {
    setPrefs(p => (p.includes(key) ? p.filter(k => k !== key) : [...p, key]));
  }

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, preferences: prefs, source: "site-form" }),
      });
      if (res.ok) {
        const d = await res.json().catch(() => ({}));
        setNeedsConfirm(!!d.requiresConfirmation);
        setStatus("success");
        setEmail("");
        setPrefs([]);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="newsletter-box center">
        <p className="newsletter-title accent">Teşekkürler!</p>
        <p className="newsletter-desc">
          {needsConfirm
            ? "Aboneliğinizi tamamlamak için e-postanıza gönderdiğimiz onay bağlantısına tıklayın."
            : "Günlük bültenimize kaydoldunuz."}
        </p>
      </div>
    );
  }

  return (
    <div className="newsletter-box" aria-busy={status === "loading"}>
      <p className="newsletter-eyebrow">Ücretsiz Bülten</p>
      <p className="newsletter-title">Günlük Finans Bülteni</p>
      <p className="newsletter-desc">Her sabah piyasa özeti ve öne çıkan haberler e-postanızda.</p>
      <form onSubmit={subscribe} className="newsletter-form">
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="E-posta adresiniz" required aria-label="E-posta adresiniz"
          className="newsletter-input"
        />
        <button type="submit" disabled={status === "loading"} className="btn">
          {status === "loading" ? "..." : "Abone Ol"}
        </button>
      </form>
      <div className="newsletter-prefs">
        {PREFS.map(p => (
          <button
            key={p.key}
            type="button"
            aria-pressed={prefs.includes(p.key)}
            onClick={() => togglePref(p.key)}
            className={`newsletter-chip${prefs.includes(p.key) ? " on" : ""}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="newsletter-fineprint">
        İlgi alanı seçmezseniz tüm kategorilerden haber alırsınız.
      </p>
      {status === "error" && <p className="newsletter-error" role="alert">Bir hata oluştu, tekrar deneyin.</p>}
    </div>
  );
}
