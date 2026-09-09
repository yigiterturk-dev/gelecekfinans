/**
 * Makale sayfası iskeleti.
 *
 * Bu sayfa `force-dynamic` (premium kapısı oturum okuyor), yani HER istek
 * veritabanına gidiyor ve kullanıcı o süre boyunca boş ekrana bakıyordu.
 * İskelet gerçek makale düzeninin ölçülerini taklit eder ki içerik gelince
 * sayfa zıplamasın.
 */
export default function Loading() {
  return (
    <div className="container" aria-busy="true" aria-live="polite">
      <span className="sr-only">Makale yükleniyor…</span>
      <div className="skeleton" style={{ height: 22, width: 90, marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 38, width: "85%", marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 38, width: "60%", marginBottom: 18 }} />
      <div className="skeleton skeleton-satir" style={{ width: 220, marginBottom: 20 }} />
      <div className="skeleton skeleton-gorsel" style={{ marginBottom: 24 }} />
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="skeleton skeleton-satir" style={{ width: i % 4 === 3 ? "55%" : "100%" }} />
      ))}
    </div>
  );
}
