import assert from "node:assert/strict";
import test from "node:test";
import type { ArticleDraft } from "../lib/bot/article-schema";
import { GUIDE_QUALITY_PRESET, validateDraft } from "../lib/bot/quality";
import { buildGuideTopic, extractReferenceTextFromHtml } from "../lib/bot/evergreen";
import { matchOfficialSources } from "../lib/bot/official-sources";
import type { EvidencePacket } from "../lib/bot/research";

const KEYWORD = {
  id: "k1", term: "altın yatırımı nasıl yapılır", category: "altin",
  cluster: "altin-yatirimi", isHub: true, intent: "INFORMATIONAL", priority: 90, origin: "seed",
};

const CONCEPTUAL_PACKET: EvidencePacket = {
  storyKey: "guide", status: "VERIFIED", independentSourceCount: 0, evidence: [], reasons: [],
};

function guideDraft(overrides: Partial<ArticleDraft> = {}): ArticleDraft {
  const paragraph = "Altın yatırımı, tasarrufun bir bölümünü kıymetli madende tutmayı ifade eder ve saklama, saflık ile alım satım farkı gibi başlıklar altında değerlendirilir. ";
  return {
    title: "Altın yatırımı nasıl yapılır: yöntemler ve dikkat edilecekler",
    meta: "Altın yatırımı nasıl yapılır sorusuna kapsamlı rehber: yöntemler, saklama seçenekleri, maliyet kalemleri ve yeni başlayanların sık yaptığı hatalar burada.",
    keyword: "altın yatırımı nasıl yapılır",
    lede: "altın yatırımı nasıl yapılır sorusunun yanıtı, yöntemleri ve maliyetleri birlikte değerlendirmekle başlar.",
    sections: Array.from({ length: 4 }, (_, index) => ({
      heading: `Bölüm ${index + 1}: hangi yöntem size uygun?`,
      paragraphs: [paragraph.repeat(10) + `Bölüm ${index + 1} ayrıntısı.`],
      bullets: [],
    })),
    summary: ["özet bir", "özet iki", "özet üç"],
    impact: "Tasarruf sahibi için pratik sonuç.",
    faq: [
      { q: "Soru bir?", a: "Cevap bir." }, { q: "Soru iki?", a: "Cevap iki." },
      { q: "Soru üç?", a: "Cevap üç." }, { q: "Soru dört?", a: "Cevap dört." },
    ],
    claims: [],
    disclaimer: "Bu içerik yalnızca bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.",
    ...overrides,
  } as ArticleDraft;
}

test("rehber kapısı kanıt paketi olmadan da geçebilir", () => {
  const report = validateDraft(guideDraft(), CONCEPTUAL_PACKET, GUIDE_QUALITY_PRESET);
  assert.deepEqual(report.issues, []);
});

test("rehberde yüzde, ondalık, büyük sayı ve para tutarı reddedilir", () => {
  const cases: Array<[string, RegExp]> = [
    ["Stopaj oranı %10 olarak uygulanır.", /yüzde\/oran/],
    ["Saflık 99,5 seviyesindedir.", /ondalıklı/],
    ["Fiyat 4655 seviyesine çıktı.", /dört haneli/],
    ["Asgari tutar 500 TL olarak belirlendi.", /para tutarı/],
  ];
  for (const [sentence, expected] of cases) {
    const draft = guideDraft();
    draft.sections[0].paragraphs.push(sentence);
    const report = validateDraft(draft, CONCEPTUAL_PACKET, GUIDE_QUALITY_PRESET);
    assert.ok(
      report.issues.some((issue) => expected.test(issue)),
      `"${sentence}" reddedilmeliydi, sorunlar: ${report.issues.join(" | ")}`,
    );
  }
});

test("rehberde küçük sayılar serbesttir", () => {
  const draft = guideDraft();
  draft.sections[0].paragraphs.push("Süreç 3 adımdan oluşur ve 18 yaşını doldurmak gerekir.");
  const report = validateDraft(draft, CONCEPTUAL_PACKET, GUIDE_QUALITY_PRESET);
  assert.deepEqual(report.issues, []);
});

test("kavramsal rehber konusu dış kaynağa çıkmadan hazırlanır", async () => {
  const topic = await buildGuideTopic(KEYWORD, {
    fetcher: async () => {
      throw new Error("kavramsal modda ağ çağrısı yapılmamalı");
    },
  });
  assert.equal(topic.evidencePacket.status, "VERIFIED");
  assert.equal(topic.evidencePacket.evidence.length, 0);
  assert.equal(topic.cluster, "altin-yatirimi");
});

test("resmî kaynak modu kanıt çıkmazsa konuyu yetersiz işaretler", async () => {
  const topic = await buildGuideTopic(KEYWORD, {
    useOfficialSources: true,
    fetcher: async () => null,
  });
  assert.equal(topic.evidencePacket.status, "INSUFFICIENT");
});

test("resmî kaynak eşleştirmesi kelimeye göre çalışır", () => {
  assert.ok(matchOfficialSources("altın vergisi var mı").some((s) => /GİB/.test(s.name)));
  assert.ok(matchOfficialSources("bist 100 nedir").some((s) => /Borsa İstanbul/.test(s.name)));
  assert.equal(matchOfficialSources("tamamen alakasız bir ifade").length, 0);
});

test("kurum sayfasından gövde paragrafları çıkarılır", () => {
  const html = `<html><body><nav><a href="/x">Menü bağlantısı buraya</a></nav>
    <div><p>${"Bu cümle kurumun açıklama metnidir ve yeterince uzundur. ".repeat(6)}</p></div>
    <footer><p>kısa</p></footer></body></html>`;
  const text = extractReferenceTextFromHtml(html);
  assert.ok(text && text.length > 260);
  assert.ok(!text.includes("Menü bağlantısı"));
});
