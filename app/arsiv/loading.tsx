/** Arşiv sayfası iskeleti — liste düzenini taklit eder. */
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
