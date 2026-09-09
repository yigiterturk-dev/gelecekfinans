/**
 * Kök yükleniyor iskeleti.
 *
 * Neden var: 2026-09-09 denetimi "32 sayfa var, hiç loading.tsx yok" dedi.
 * force-dynamic sayfalarda (makale, kategori, arşiv) sunucu sorgusu dönene
 * kadar kullanıcı bomboş ekrana bakıyordu. Bu dosyanın varlığı Next'in
 * Suspense sınırını kendiliğinden kurmasını sağlıyor.
 *
 * ⚠️ İskelet, gerçek düzenin ÖLÇÜLERİNİ taklit etmeli; etmezse içerik gelince
 * sayfa zıplar (CLS) ve iskelet faydadan çok zarar verir.
 */
export default function Loading() {
  return (
    <div className="container" aria-busy="true" aria-live="polite">
      <span className="sr-only">Yükleniyor…</span>
      <div className="skeleton skeleton-baslik" />
      <div className="resp-grid-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton-kart">
            <div className="skeleton skeleton-gorsel" />
            <div className="skeleton skeleton-satir" style={{ width: "90%" }} />
            <div className="skeleton skeleton-satir" style={{ width: "65%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
