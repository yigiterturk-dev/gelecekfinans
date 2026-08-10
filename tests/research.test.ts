import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEvidencePacket,
  evidenceMaterialCharacterCount,
  extractArticleTextFromHtml,
  hasConflictingStoryPhase,
  publisherKey,
  storySimilarity,
  type ResearchCandidate,
} from "../lib/bot/research";

const primary: ResearchCandidate = {
  title: "TCMB politika faizini yüzde 43'te sabit tuttu",
  summary: "Merkez Bankası kurul kararıyla politika faizini yüzde 43 düzeyinde korudu.",
  source: "Anadolu Ajansı",
  sourceUrl: "https://aa.com.tr/ekonomi/faiz-karari",
  pubDate: Date.now(),
  sourcePriority: 3,
  category: "ekonomi",
};

test("aynı olayın farklı manşetleri eşleştirilir", () => {
  assert.ok(storySimilarity(primary.title, "Merkez Bankası faiz kararını açıkladı: Oran yüzde 43") >= 0.44);
  assert.ok(storySimilarity(primary.title, "Bitcoin haftaya yükselişle başladı") < 0.44);
});

test("aynı günün açılış ve kapanış haberleri birbirini doğrulamaz", () => {
  assert.equal(hasConflictingStoryPhase(
    "Piyasa kapanışı: BIST 100 günü yükselişle tamamladı",
    "Borsa İstanbul açıldı: BIST 100 güne yükselişle başladı",
  ), true);
  const opening: ResearchCandidate = {
    ...primary,
    title: "Borsa İstanbul açıldı: BIST 100 güne yükselişle başladı",
    source: "Mynet",
    sourceUrl: "https://mynet.com/borsa-acilis",
  };
  const packet = buildEvidencePacket({ ...primary, title: "Borsa günü yükselişle tamamladı" }, [
    { ...primary, title: "Borsa günü yükselişle tamamladı" }, opening,
  ]);
  assert.equal(packet.status, "INSUFFICIENT");
});

test("ortak tarih tek başına farklı borsa haberlerini eşleştirmez", () => {
  assert.ok(storySimilarity(
    "Piyasa kapanışı: 05 Ağustos 2026 Çarşamba Borsa, dolar, altın ve kripto paralarda bugün ne oldu?",
    "CIMSA 05 Ağustos Çarşamba 2026 Günlük Teknik Analiz",
  ) < 0.44);
  assert.ok(storySimilarity(
    "Piyasa kapanışı: Borsa, dolar ve altın verileri",
    "Borsa günü yükselişle tamamladı: Altın ve dolarda son durum",
  ) >= 0.44);
});

test("iki farklı yayıncı doğrulanmış kanıt paketi oluşturur", () => {
  const second: ResearchCandidate = {
    ...primary,
    title: "Merkez Bankası faiz kararını açıkladı: Oran yüzde 43",
    source: "NTV",
    sourceUrl: "https://ntv.com.tr/ekonomi/faiz-karari",
    sourcePriority: 3,
  };
  const packet = buildEvidencePacket(primary, [primary, second]);
  assert.equal(packet.status, "VERIFIED");
  assert.equal(packet.independentSourceCount, 2);
  assert.notEqual(packet.evidence[0].publisherKey, packet.evidence[1].publisherKey);
});

test("Google Haberler başlığındaki yayıncı bağımsız kimlik olarak ayrılır", () => {
  assert.equal(publisherKey({
    title: "TCMB faiz kararını açıkladı - Ekonomi Gazetesi",
    source: "Google Haberler",
    sourceUrl: "https://news.google.com/articles/example",
  }), "publisher:ekonomi gazetesi");
});

test("aynı yayıncının doğrudan feed'i ile Google kopyası iki kaynak sayılmaz", () => {
  assert.equal(
    publisherKey({ title: "Faiz kararı", source: "NTV", sourceUrl: "https://www.ntv.com.tr/ekonomi/ornek" }),
    publisherKey({ title: "Faiz kararı - NTV", source: "Google Haberler", sourceUrl: "https://news.google.com/articles/ornek" }),
  );
});

test("JSON-LD articleBody ayrıntılı kanıt metnine çevrilir", () => {
  const extracted = extractArticleTextFromHtml(`
    <script type="application/ld+json">
      {"@type":"NewsArticle","articleBody":"${"BDDK kredi sınırlarını değiştirdi. ".repeat(12)}"}
    </script>
  `);
  assert.equal(extracted?.method, "JSON_LD");
  assert.match(extracted?.content || "", /BDDK kredi sınırlarını değiştirdi/);
});

test("kanıt malzemesi RSS özeti yerine zengin haber metnini sayar", () => {
  const packet = buildEvidencePacket(primary, [primary, {
    ...primary,
    source: "NTV",
    sourceUrl: "https://ntv.com.tr/ekonomi/faiz-karari",
  }]);
  packet.evidence[0].content = "Ayrıntılı kanıt ".repeat(80);
  assert.ok(evidenceMaterialCharacterCount(packet) > 800);
});
