/** Kategori sayfası iskeleti — başlık + haber ızgarası düzenini taklit eder. */
export default function Loading() {
  return (
    <div className="container page-cat" aria-busy="true" aria-live="polite">
      <span className="sr-only">Kategori yükleniyor…</span>
      <div className="cat-header">
        <div className="skeleton" style={{ height: 22, width: 90, marginBottom: 10 }} />
        <div className="skeleton skeleton-baslik" />
        <div className="skeleton skeleton-satir" style={{ width: 100 }} />
      </div>
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
