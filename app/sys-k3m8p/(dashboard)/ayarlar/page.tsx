"use client";
import { useEffect, useState } from "react";

type SettingsForm = {
  ga4Id: string;
  adsenseId: string;
  searchConsoleVerification: string;
  adSlotIds: { headerBanner: string; inArticle: string; sidebar: string; afterArticle: string };
  adSlots: { headerBanner: boolean; inArticle: boolean; sidebar: boolean; afterArticle: boolean };
  autonomy: { cronEnabled: boolean; enabled: boolean; dailyArticleCount: number; targetWords: number };
};

const DEFAULT_SETTINGS: SettingsForm = {
  ga4Id: "", adsenseId: "", searchConsoleVerification: "",
  adSlotIds: { headerBanner: "", inArticle: "", sidebar: "", afterArticle: "" },
  adSlots: { headerBanner: false, inArticle: false, sidebar: false, afterArticle: false },
  autonomy: { cronEnabled: false, enabled: false, dailyArticleCount: 1, targetWords: 650 },
};

function normalizeSettings(value: unknown): SettingsForm | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  const nested = (key: string) => {
    const child = data[key];
    return child && typeof child === "object" && !Array.isArray(child)
      ? child as Record<string, unknown>
      : {};
  };
  const adSlotIds = nested("adSlotIds");
  const adSlots = nested("adSlots");
  const autonomy = nested("autonomy");
  const stringValue = (source: Record<string, unknown>, key: string, fallback: string) =>
    typeof source[key] === "string" ? source[key] as string : fallback;
  const booleanValue = (source: Record<string, unknown>, key: string, fallback: boolean) =>
    typeof source[key] === "boolean" ? source[key] as boolean : fallback;
  const numberValue = (source: Record<string, unknown>, key: string, fallback: number) =>
    typeof source[key] === "number" && Number.isFinite(source[key]) ? source[key] as number : fallback;

  return {
    ga4Id: stringValue(data, "ga4Id", DEFAULT_SETTINGS.ga4Id),
    adsenseId: stringValue(data, "adsenseId", DEFAULT_SETTINGS.adsenseId),
    searchConsoleVerification: stringValue(data, "searchConsoleVerification", DEFAULT_SETTINGS.searchConsoleVerification),
    adSlotIds: {
      headerBanner: stringValue(adSlotIds, "headerBanner", ""),
      inArticle: stringValue(adSlotIds, "inArticle", ""),
      sidebar: stringValue(adSlotIds, "sidebar", ""),
      afterArticle: stringValue(adSlotIds, "afterArticle", ""),
    },
    adSlots: {
      headerBanner: booleanValue(adSlots, "headerBanner", false),
      inArticle: booleanValue(adSlots, "inArticle", false),
      sidebar: booleanValue(adSlots, "sidebar", false),
      afterArticle: booleanValue(adSlots, "afterArticle", false),
    },
    autonomy: {
      cronEnabled: booleanValue(autonomy, "cronEnabled", false),
      enabled: booleanValue(autonomy, "enabled", false),
      dailyArticleCount: numberValue(autonomy, "dailyArticleCount", 1),
      targetWords: numberValue(autonomy, "targetWords", 650),
    },
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsForm>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const response = await fetch("/api/admin/settings", { signal: controller.signal });
        if (response.status === 401) throw new Error("Oturum süreniz dolmuş olabilir. Yeniden giriş yapın.");
        if (!response.ok) throw new Error("Ayarlar şu anda yüklenemiyor.");
        const data: unknown = await response.json();
        const normalized = normalizeSettings(data);
        if (!normalized) throw new Error("Sunucudan gelen ayarlar geçersiz.");
        setSettings(normalized);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setLoadError(cause instanceof Error ? cause.message : "Ayarlar şu anda yüklenemiyor.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [reloadKey]);

  async function save() {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (response.status === 401) throw new Error("Oturum süreniz dolmuş olabilir. Yeniden giriş yapın.");
      if (!response.ok) throw new Error("Ayarlar kaydedilemedi. Lütfen tekrar deneyin.");
      const data: unknown = await response.json();
      const normalized = normalizeSettings(data);
      if (!normalized) throw new Error("Sunucu kaydı doğrulayamadı.");
      setSettings(normalized);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "Ayarlar kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p style={{ color: "var(--muted)" }}>Ayarlar yükleniyor...</p>;
  if (loadError) return (
    <div role="alert" style={{ color: "var(--dn, #dc2626)" }}>
      <p>{loadError}</p>
      <button type="button" className="adm-btn" onClick={() => setReloadKey((key) => key + 1)}>Yeniden dene</button>{" "}
      <a href="/sys-k3m8p/giris" style={{ color: "inherit", textDecoration: "underline" }}>Yönetim paneline giriş</a>
    </div>
  );

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 className="adm-h1" style={{ marginBottom: 22 }}>Site Ayarları</h1>

      <Section title="Google Analytics">
        <Field label="GA4 Measurement ID" placeholder="G-XXXXXXXXXX" value={settings.ga4Id}
          onChange={v => setSettings(s => ({ ...s, ga4Id: v }))} />
      </Section>

      <Section title="Google Search Console">
        <Field label="Doğrulama Kodu (google-site-verification içeriği)"
          placeholder="örn. 4aVBJpoKMchlL_iSElublDYdFr8BMugU2qMg3zU32D8"
          value={settings.searchConsoleVerification}
          onChange={v => setSettings(s => ({ ...s, searchConsoleVerification: v }))} />
        <p className="adm-label" style={{ margin: "8px 0 0", lineHeight: 1.5 }}>
          Search Console&apos;da &quot;HTML etiketi&quot; doğrulama yöntemini seçin;
          <code>&lt;meta name=&quot;google-site-verification&quot; content=&quot;...&quot;&gt;</code> içindeki
          <b> content </b> değerini buraya yapıştırın. Boş bırakırsanız meta etiketi eklenmez.
        </p>
      </Section>

      <Section title="Google AdSense">
        <Field label="AdSense Publisher ID" placeholder="ca-pub-XXXXXXXX" value={settings.adsenseId}
          onChange={v => setSettings(s => ({ ...s, adsenseId: v }))} />
        <p className="adm-label" style={{ margin: "12px 0 8px" }}>Reklam Pozisyonları</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Toggle label="Header Banner" checked={settings.adSlots.headerBanner}
            onChange={v => setSettings(s => ({ ...s, adSlots: { ...s.adSlots, headerBanner: v } }))} />
          <Toggle label="Makale İçi" checked={settings.adSlots.inArticle}
            onChange={v => setSettings(s => ({ ...s, adSlots: { ...s.adSlots, inArticle: v } }))} />
          <Toggle label="Sidebar" checked={settings.adSlots.sidebar}
            onChange={v => setSettings(s => ({ ...s, adSlots: { ...s.adSlots, sidebar: v } }))} />
          <Toggle label="Makale Altı" checked={settings.adSlots.afterArticle}
            onChange={v => setSettings(s => ({ ...s, adSlots: { ...s.adSlots, afterArticle: v } }))} />
        </div>

        <p className="adm-label" style={{ margin: "16px 0 8px" }}>Reklam Birimi Kimlikleri (data-ad-slot)</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Header Banner" placeholder="1234567890" value={settings.adSlotIds?.headerBanner ?? ""}
            onChange={v => setSettings(s => ({ ...s, adSlotIds: { ...s.adSlotIds, headerBanner: v } }))} />
          <Field label="Makale İçi" placeholder="1234567890" value={settings.adSlotIds?.inArticle ?? ""}
            onChange={v => setSettings(s => ({ ...s, adSlotIds: { ...s.adSlotIds, inArticle: v } }))} />
          <Field label="Sidebar" placeholder="1234567890" value={settings.adSlotIds?.sidebar ?? ""}
            onChange={v => setSettings(s => ({ ...s, adSlotIds: { ...s.adSlotIds, sidebar: v } }))} />
          <Field label="Makale Altı" placeholder="1234567890" value={settings.adSlotIds?.afterArticle ?? ""}
            onChange={v => setSettings(s => ({ ...s, adSlotIds: { ...s.adSlotIds, afterArticle: v } }))} />
        </div>
        <p className="adm-label" style={{ margin: "10px 0 0", lineHeight: 1.5 }}>
          Birim kimliği <b>boş bırakılırsa</b> o pozisyon Otomatik Reklam (Auto ads) moduna düşer:
          yalnızca AdSense betiği yüklenir, yerleşimi Google seçer. Kimlik girilirse manuel yerleşim
          kullanılır. Kimliği AdSense panelinde <b>Reklamlar → Reklam birimine göre</b> bölümünde
          oluşturduğunuz birimin <code>data-ad-slot</code> değerinden alırsınız.
        </p>
      </Section>

      <Section title="Otonom Yayın">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Toggle label="Günlük zamanlanmış akış çalışsın" checked={settings.autonomy.cronEnabled}
            onChange={v => setSettings(s => ({ ...s, autonomy: { ...s.autonomy, cronEnabled: v } }))} />
          <p className="adm-label" style={{ lineHeight: 1.5 }}>
            Bot haberleri ve rehberleri otomatik yayımlanmaz; canlıya çıkmadan önce editör onayı gerekir.
          </p>
        </div>
        <p className="adm-label" style={{ margin: "10px 0 0", lineHeight: 1.5 }}>
          Otomatik yayın kapalıyken cron içerikleri taslak olarak hazırlar. Editör onayı olmadan siteye çıkmaz.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
          <NumberField label="Günlük aday üst sınırı" min={1} max={2} value={settings.autonomy.dailyArticleCount}
            onChange={v => setSettings(s => ({ ...s, autonomy: { ...s.autonomy, dailyArticleCount: v } }))} />
          <NumberField label="Hedef gövde uzunluğu" min={450} max={900} step={50} value={settings.autonomy.targetWords}
            onChange={v => setSettings(s => ({ ...s, autonomy: { ...s.autonomy, targetWords: v } }))} />
        </div>
        <div style={{ marginTop: 8, padding: 12, borderRadius: 8, background: "var(--surface2)", fontSize: 12, lineHeight: 1.6, color: "var(--ink2)" }}>
          <b>Önerilen başlangıç:</b> günde 1 güçlü aday, yaklaşık 650 kelime. Araştırma taraması her gün
          10:00&apos;da (Türkiye saati) çalışır. Sayı kota değil üst sınırdır; kalite kapısı geçilmezse içerik üretilmez.
        </div>
      </Section>

      {saveError && <p role="alert" style={{ color: "var(--dn, #dc2626)" }}>{saveError}</p>}
      <button onClick={save} disabled={saving} className="adm-btn adm-btn-primary" style={{ marginTop: 2, padding: "12px 28px" }}>
        {saving ? "Kaydediliyor..." : saved ? "Kaydedildi ✓" : "Kaydet"}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="adm-card">
      <div className="adm-card-h"><div><b>{title}</b></div></div>
      <div className="adm-card-b">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span className="adm-label">{label}</span>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="adm-input" />
    </label>
  );
}

function NumberField({ label, value, onChange, min, max, step = 1 }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  function commitDraft() {
    const parsed = draft.trim() ? Number(draft) : value;
    const finiteValue = Number.isFinite(parsed) ? parsed : value;
    const boundedValue = Math.min(max, Math.max(min, finiteValue));
    const steppedValue = min + Math.round((boundedValue - min) / step) * step;
    const normalizedValue = Math.min(max, Math.max(min, Number(steppedValue.toFixed(8))));
    onChange(normalizedValue);
    setDraft(String(normalizedValue));
    setFocused(false);
  }

  return (
    <label style={{ display: "block" }}>
      <span className="adm-label">{label}</span>
      <input type="number" value={draft} min={min} max={max} step={step}
        onFocus={() => setFocused(true)}
        onChange={e => {
          const raw = e.target.value;
          setDraft(raw);
          const next = e.target.valueAsNumber;
          if (Number.isFinite(next) && next >= min && next <= max) onChange(next);
        }}
        onBlur={commitDraft}
        className="adm-input" />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: "4px 0" }}>
      <span className="adm-sw">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="track" />
      </span>
      <span style={{ fontSize: 13, color: "var(--ink2)" }}>{label}</span>
    </label>
  );
}
