import type { FaqItem } from "@/lib/market-faq";

/**
 * Canlı veri sayfalarındaki "Sık Sorulanlar" bölümü + FAQPage JSON-LD.
 *
 * Neden var: 2026-09-04 indeks taramasında sitemap'teki 85 adresin 16'sı
 * "Discovered - currently not indexed" çıktı — Google adresi biliyor ama
 * taramaya değer görmüyor. Dışarıda kalanların çoğu canlı veri sayfası
 * (/altin, /altin/gram-altin, /altin/ons, /kripto/bnb, hesaplama araçları):
 * hepsi bir tablo + iki cümleden ibaretti. Aynı kalıptaki /doviz indekste,
 * çünkü ona daha çok bağlantı geliyor — fark sayfanın kendi ağırlığında.
 *
 * Bu bileşen o ağırlığı veriyor: her sayfaya o varlığa ÖZEL soru-cevap.
 * ⚠️ Metinlerde değişken rakam YOK (fiyat, oran, yüzde) — hem kalite kapısının
 * kuralı bu, hem de sayfa bayatlamasın diye. Rakamlar tablodan gelir.
 */
export default function MarketFaq({ items, title = "Sık Sorulan Sorular" }: { items: FaqItem[]; title?: string }) {
  if (items.length === 0) return null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <section className="section market-faq">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h2 className="market-h2">{title}</h2>
      <div className="market-faq-list">
        {items.map((f) => (
          <details key={f.q} className="market-faq-item">
            <summary className="market-faq-q">{f.q}</summary>
            <p className="market-faq-a">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
