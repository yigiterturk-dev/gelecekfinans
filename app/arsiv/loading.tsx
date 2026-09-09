/**
 * Arşiv sayfası iskeleti — liste düzenini taklit eder.
 *
 * 🔴 ÖLÇÜLEN TUZAK (2026-09-09): `loading.tsx` bir Suspense sınırı kurar;
 * Next yanıtı erken akıtmaya başlar ve durum kodu 200'de KİLİTLENİR. Sonra
 * çağrılan `notFound()` sayfayı 404 UI'ıyla gösterir ama HTTP 404 dönmez —
 * yani "soft 404". O gün eklediğim kök/kategori/makale iskeletleri tam olarak
 * bunu yaptı: `/borsa/XXXX` 404 iken 200'e döndü. Ölçümle kanıtlandı (kök
 * loading.tsx kaldırılınca 404'e geri döndü) ve üçü de geri alındı.
 *
 * ⚠️ KURAL: `notFound()` çağırabilen bir rotaya (ve onun ÜSTÜNDEKİ hiçbir
 * segmente) loading.tsx KOYMA. Arşiv güvenli: bilinmeyen adres yönlendirmede
 * eleniyor, sayfa notFound() çağırmıyor. tests/soft404.test.ts bekçilik ediyor.
 */
export default function Loading() {
  return (
    <div className="container" aria-busy="true" aria-live="polite">
      <span className="sr-only">Arşiv yükleniyor…</span>
      <div className="skeleton skeleton-baslik" />
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 18 }}>
          <div className="skeleton skeleton-satir" style={{ width: "75%", height: 18 }} />
          <div className="skeleton skeleton-satir" style={{ width: "35%" }} />
        </div>
      ))}
    </div>
  );
}
