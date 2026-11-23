"use client";
import { useState } from "react";

const PREFS: { key: string; label: string }[] = [
  { key: "kripto", label: "Kripto" },
  { key: "borsa", label: "Borsa" },
  { key: "doviz", label: "Döviz" },
  { key: "altin", label: "Altın" },
  { key: "ekonomi", label: "Ekonomi" },
];

export default function Newsletter({ enabled = true }: { enabled?: boolean }) {
  const [email, setEmail] = useState("");
  const [prefs, setPrefs] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function togglePref(key: string) {
    setPrefs(p => (p.includes(key) ? p.filter(k => k !== key) : [...p, key]));
  }

  if (!enabled) {
    return (
      <div className="newsletter-box center" role="status">
        <p className="newsletter-title">E-posta bülteni şu an kapalı</p>
        <p className="newsletter-desc">
          E-posta gönderimi hazır olmadığı için şu anda kayıt almıyoruz.
        </p>
      </div>
    );
  }

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, preferences: prefs, source: "site-form" }),
      });
      const d: unknown = await res.json().catch(() => null);
      if (res.ok) {
        if (d && typeof d === "object"
          && "ok" in d && d.ok === true
          && "requiresConfirmation" in d && d.requiresConfirmation === true
          && "confirmationSent" in d && d.confirmationSent === true) {
          setNeedsConfirm(true);
          setStatus("success");
          setEmail("");
          setPrefs([]);
        } else {
          setErrorMessage("Kayıt isteği alındı ancak onay e-postası doğrulanamadı. Lütfen biraz sonra tekrar deneyin.");
          setStatus("error");
        }
      } else {
        const message = d && typeof d === "object" && "error" in d && typeof d.error === "string"
          ? d.error
          : "Bültene şu anda kaydolunamıyor.";
        setErrorMessage(message);
        setStatus("error");
      }
    } catch {
      setErrorMessage("Sunucuya ulaşılamadı. Lütfen biraz sonra tekrar deneyin.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="newsletter-box center" role="status">
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
      <div className="newsletter-copy">
      <p className="newsletter-eyebrow">Ücretsiz Bülten</p>
      <h2 className="newsletter-title">Gündemi yakalayın.<br />Güne bir adım önde başlayın.</h2>
      <p className="newsletter-desc">Her sabah piyasa özeti ve öne çıkan haberler e-postanızda.</p>
      </div>
      <div className="newsletter-signup">
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
      {status === "error" && <p className="newsletter-error" role="alert">{errorMessage || "Bültene şu anda kaydolunamıyor."}</p>}
      </div>
    </div>
  );
}
