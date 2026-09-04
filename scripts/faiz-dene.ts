/**
 * EVDS bağlantısını ve seri kodunu DOĞRULAR.
 *
 * Anahtar alındıktan sonra ilk iş bu: dönen değer bugünkü politika faiziyle
 * uyuşuyor mu? Uyuşmuyorsa seri kodu yanlıştır, `EVDS_POLICY_SERIES` ile
 * düzeltilmeli. Doğrulanmadan sayfaya bağlanmaz.
 *
 *   npx tsx --env-file=.env --env-file=.env.local scripts/faiz-dene.ts
 */
import { fetchPolicyRate } from "../lib/tcmb-evds";

(async () => {
  if (!process.env.EVDS_API_KEY) {
    console.log("EVDS_API_KEY yok — sayfa sabit tabloya düşüyor.");
    console.log("Ücretsiz anahtar: https://evds2.tcmb.gov.tr → Giriş → Profil → API Anahtarı");
    process.exit(0);
  }
  const r = await fetchPolicyRate();
  if (!r) {
    console.log("Veri alınamadı: anahtar geçersiz olabilir ya da seri kodu yanlış.");
    process.exit(1);
  }
  console.log(`seri : ${r.series}`);
  console.log(`tarih: ${r.date}`);
  console.log(`değer: %${r.value}`);
  console.log("\n⚠️ Bu değeri TCMB'nin açıkladığı güncel politika faiziyle KARŞILAŞTIR.");
  console.log("Uyuşmuyorsa EVDS_POLICY_SERIES ile doğru seriyi ver.");
})();
