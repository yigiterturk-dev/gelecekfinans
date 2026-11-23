/**
 * TCMB EVDS adaptörü — politika faizini canlı çeker.
 *
 * Neden: /faiz sayfasındaki oranlar `lib/market.ts` içinde SABİT yazılıydı ve
 * 2026-06 dönemine aitti; 4 Eylül'de sayfa üç aylık veriyle "güncel faiz
 * oranları" diyordu. Finans sitesinde yanlış faiz göstermek en pahalı hata.
 *
 * ⚠️ Bu adapter public faiz sayfasında kullanılmıyor: seri kodu canlı yanıtla
 * doğrulanmadı. 2026-11-12'de TCMB'nin faiz tablolarının sunucu HTML'inde
 * okunabildiği görüldü; public page bunun yerine `lib/tcmb-faiz.ts` kullanır.
 * Bu adapter yalnızca seri kodunu manuel doğrulamak için tutulur.
 *
 * Anahtar yoksa bu adapter null döner. Public /faiz sayfası kendi resmi TCMB
 * tablo okuyucusunu kullanır; tablo da okunamazsa tarihli statik fallback gösterir.
 *
 * ⚠️ SERİ KODU DOĞRULANMADI: EVDS kataloğuna erişilemediği
 * için varsayılan seri kodu (`TP.APIFON4`) canlı yanıtla teyit EDİLMEDİ.
 * Anahtar geldiğinde ÖNCE `npx tsx scripts/faiz-dene.ts` çalıştırın; dönen
 * etiket ve değer beklenenle uyuşmuyorsa `EVDS_POLICY_SERIES` ile düzeltin.
 * Doğrulanmamış bir seriyi sayfaya basmak, sabit tabloyu basmaktan daha
 * tehlikelidir — biri bayat olduğunu söylüyor, diğeri yanlışı canlı sanıyor.
 */

export interface PolicyRate {
  value: number;
  /** Verinin ait olduğu tarih (EVDS'nin döndürdüğü biçimde, örn. "04-09-2026"). */
  date: string;
  series: string;
}

const DEFAULT_SERIES = "TP.APIFON4";

function gunFormat(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
}

/**
 * Son yayımlanan politika faizi değerini döner. Anahtar yoksa, istek
 * başarısızsa ya da yanıt beklenen biçimde değilse null — çağıran taraf
 * sabit tabloya düşer.
 */
export async function fetchPolicyRate(): Promise<PolicyRate | null> {
  const key = process.env.EVDS_API_KEY;
  if (!key) return null;
  const series = process.env.EVDS_POLICY_SERIES || DEFAULT_SERIES;

  // Son 90 gün: faiz her gün değişmez, boş dönmemesi için geniş pencere.
  const bugun = new Date();
  const baslangic = new Date(bugun.getTime() - 90 * 24 * 60 * 60 * 1000);
  const url =
    `https://evds2.tcmb.gov.tr/service/evds/series=${encodeURIComponent(series)}` +
    `&startDate=${gunFormat(baslangic)}&endDate=${gunFormat(bugun)}&type=json`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: controller.signal,
      headers: { key, Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: Array<Record<string, string>> };
    const items = data.items ?? [];
    // Seri kodundaki nokta yanıt alanlarında alt çizgiye dönüşüyor.
    const alan = series.replace(/\./g, "_");
    // Sondan başa: son DOLU değeri bul (tatil günleri boş gelir).
    for (let i = items.length - 1; i >= 0; i--) {
      const ham = items[i]?.[alan];
      const tarih = items[i]?.Tarih;
      if (!ham || !tarih) continue;
      const deger = Number(String(ham).replace(",", "."));
      if (Number.isFinite(deger) && deger > 0) {
        return { value: deger, date: tarih, series };
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
