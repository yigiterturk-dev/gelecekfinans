import assert from "node:assert/strict";
import test from "node:test";
import type { ArticleDraft } from "../lib/bot/article-schema";
import { renderDraftHtml, validateDraft, stripEvidenceMarkers } from "../lib/bot/quality";
import type { EvidencePacket } from "../lib/bot/research";

const packet: EvidencePacket = {
  storyKey: "tcmb-faiz-karari",
  status: "VERIFIED",
  independentSourceCount: 2,
  reasons: ["2 bağımsız yayıncı aynı olayı destekliyor"],
  evidence: [
    {
      id: "ev-1",
      title: "TCMB politika faizini yüzde 43'te sabit tuttu",
      summary: "Kurul politika faizini yüzde 43 düzeyinde korudu.",
      source: "Kaynak Bir",
      sourceUrl: "https://example.com/bir",
      publisherKey: "example.com",
      publishedAt: "2026-08-06T10:00:00.000Z",
      sourceScore: 95,
    },
    {
      id: "ev-2",
      title: "Merkez Bankası faiz kararını açıkladı",
      summary: "Politika faizi yüzde 43 seviyesinde sabit kaldı.",
      source: "Kaynak İki",
      sourceUrl: "https://example.org/iki",
      publisherKey: "example.org",
      publishedAt: "2026-08-06T10:05:00.000Z",
      sourceScore: 80,
    },
  ],
};

function validDraft(): ArticleDraft {
  const body = Array.from({ length: 285 }, (_, index) => index % 2 ? "kararın" : "bağlamı").join(" ");
  return {
    title: "TCMB politika faizini yüzde 43 seviyesinde sabit tuttu",
    meta: "Faiz kararı kapsamında TCMB, politika faizini yüzde 43 seviyesinde sabit bıraktı; kararın açıklanan ayrıntıları ve mevcut çerçevesi.",
    keyword: "faiz kararı",
    lede: "Faiz kararı kapsamında TCMB, politika faizini yüzde 43 seviyesinde sabit tuttu.",
    sections: [{ heading: "Kararın çerçevesi", paragraphs: [body], bullets: [] }],
    summary: ["Politika faizi sabit kaldı.", "Karar TCMB tarafından açıklandı.", "Oran yüzde 43 olarak duyuruldu."],
    impact: "Karar mevcut politika faizi seviyesinin korunduğunu gösteriyor.",
    faq: [
      { q: "Kararı kim açıkladı?", a: "Karar TCMB tarafından açıklandı." },
      { q: "Faiz değişti mi?", a: "Politika faizi sabit kaldı." },
      { q: "Oran kaç?", a: "Kaynaklarda oran yüzde 43 olarak yer aldı." },
    ],
    claims: [{ text: "Politika faizi yüzde 43 seviyesinde sabit kaldı.", kind: "FACT", evidenceIds: ["ev-1", "ev-2"] }],
    disclaimer: "Bu içerik yalnızca bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.",
  };
}

test("kaynaklara bağlı yapılandırılmış taslak kalite kapısını geçer", () => {
  const report = validateDraft(validDraft(), packet);
  assert.equal(report.passed, true, report.issues.join("; "));
});

test("kaynakta olmayan rakam ve kanıt kimliği taslağı bloke eder", () => {
  const draft = validDraft();
  draft.claims[0] = { text: "Politika faizi yüzde 55 oldu.", kind: "FACT", evidenceIds: ["ev-yok"] };
  const report = validateDraft(draft, packet);
  assert.equal(report.passed, false);
  assert.match(report.issues.join(" "), /55/);
  assert.match(report.issues.join(" "), /ev-yok/);
});

test("Türkçe tarih ve endeks biçimlerinin güvenli eşdeğerlerini kabul eder", () => {
  const formattedPacket: EvidencePacket = {
    ...packet,
    evidence: packet.evidence.map((item) => ({
      ...item,
      summary: `${item.summary} 05 Ağustos kapanışında endeks 13.703,13 puandaydı.`,
    })),
  };
  const draft = validDraft();
  draft.impact = "Endeks 5 Ağustos kapanışında küsuratsız ifadeyle 13.703 puanda yer aldı.";
  const report = validateDraft(draft, formattedPacket);
  assert.equal(report.passed, true, report.issues.join("; "));
});

test("noktalı kaynak ondalıklarını Türkçe yazımla eşleştirir", () => {
  const formattedPacket: EvidencePacket = {
    ...packet,
    evidence: packet.evidence.map((item) => ({
      ...item,
      content: "Günlük yükseliş yüzde 3.8 oldu; endeks en yüksek 13779.6800 puanı gördü.",
    })),
  };
  const draft = validDraft();
  draft.impact = "Günlük yükseliş yüzde 3,8 olurken gün içi en yüksek değer 13.779,68 puandı.";
  const report = validateDraft(draft, formattedPacket);
  assert.equal(report.passed, true, report.issues.join("; "));
});

/**
 * Canlı arıza (3 Eylül 2026, koşu cmtlpfilu0000i804lebplv7k): TCMB rezerv
 * haberi iki kez "Kaynaklarda bulunmayan rakamlar: 3.1, 71.1, 2.9, 117.1"
 * ile bloklandı. Model uydurmamıştı — kaynak "117 milyar 100 milyon dolar"
 * yazıyor, model bunu doğru şekilde "117,1 milyar dolar" olarak aktarıyordu.
 * Kapı bileşik yazımı iki ayrı sayı (117 ve 100) olarak görüyordu.
 */
test("bileşik Türkçe büyüklük yazımını ondalık karşılığıyla eşleştirir", () => {
  const formattedPacket: EvidencePacket = {
    ...packet,
    evidence: packet.evidence.map((item) => ({
      ...item,
      content:
        "Brüt döviz rezervi 117 milyar 100 milyon dolar, altın rezervi 71 milyar 100 milyon dolar oldu. "
        + "Toplam rezerv 3 milyar 100 milyon dolar artarak 188 milyar 200 milyon dolara yükseldi; "
        + "net rezerv 2 milyar 900 milyon dolar arttı.",
    })),
  };
  const draft = validDraft();
  draft.impact = "Toplam rezerv 3,1 milyar dolar artışla 188,2 milyar dolara çıktı; "
    + "döviz 117,1 milyar dolar, altın 71,1 milyar dolar, net rezerv artışı 2,9 milyar dolar oldu.";
  const report = validateDraft(draft, formattedPacket);
  assert.equal(report.passed, true, report.issues.join("; "));
});

test("bin ile yazılan bileşik mutlak değeri de kabul eder", () => {
  const formattedPacket: EvidencePacket = {
    ...packet,
    evidence: packet.evidence.map((item) => ({
      ...item,
      content: "Ons altın 4 bin 500 dolar sınırına dayandı.",
    })),
  };
  const draft = validDraft();
  draft.impact = "Ons altın 4.500 dolar sınırına dayandı.";
  const report = validateDraft(draft, formattedPacket);
  assert.equal(report.passed, true, report.issues.join("; "));
});

/** Bileşik açılım kapıyı körleştirmemeli: gerçekten uydurma sayı hâlâ durur. */
test("bileşik açılım gerçekten kaynaksız rakamı geçirmez", () => {
  const formattedPacket: EvidencePacket = {
    ...packet,
    evidence: packet.evidence.map((item) => ({
      ...item,
      content: "Brüt döviz rezervi 117 milyar 100 milyon dolar oldu.",
    })),
  };
  const draft = validDraft();
  draft.impact = "Brüt döviz rezervi 254,6 milyar dolar oldu.";
  const report = validateDraft(draft, formattedPacket);
  assert.equal(report.passed, false);
  assert.match(report.issues.join(" "), /254\.6/);
});

test("HTML modelden değil güvenli renderer'dan ve kayıtlı kaynaklardan gelir", () => {
  const html = renderDraftHtml(validDraft(), packet);
  assert.match(html, /<h2>Kaynaklar<\/h2>/);
  assert.match(html, /https:\/\/example\.com\/bir/);
  assert.doesNotMatch(html, /<script>/i);
});

/**
 * Canlı kayıtta tamamlanmış makaleler 115/118/119 karakterlik meta yüzünden
 * tamamen atılıyordu. Alt sınır 110'a indirildi; gerçekten kısa meta hâlâ
 * durdurulmalı.
 */
test("kıl payı kısa meta makaleyi çöpe atmaz", () => {
  const draft = validDraft();
  // "faiz kararı" ifadesi meta içinde birebir geçmek zorunda (ayrı kapı).
  const meta118 = `Faiz kararı sonrası TCMB politika faizini sabit tuttu; kararın ayrıntıları ve mevcut çerçevesi bu yazıda ele alınıyor.`;
  assert.equal(meta118.length, 118);
  const report = validateDraft({ ...draft, meta: meta118 }, packet);
  assert.ok(!report.issues.some((issue) => issue.startsWith("Meta uzunluğu")), report.issues.join(" | "));
});

test("gerçekten kısa meta hâlâ reddedilir", () => {
  const draft = validDraft();
  const meta95 = "Faiz kararı sonrası TCMB politika faizini sabit tuttu; kararın ayrıntıları bu yazıda ele alın";
  assert.equal(meta95.length, 93);
  const report = validateDraft({ ...draft, meta: meta95 }, packet);
  assert.ok(report.issues.some((issue) => issue.startsWith("Meta uzunluğu")));
});

test("metaya yapıştırılan Keyword etiketi reddedilir", () => {
  const packet = {
    storyKey: "k", status: "VERIFIED" as const, independentSourceCount: 2,
    evidence: [], reasons: [],
  };
  const draft = {
    title: "EPDK doğal gaz ve LPG tarifelerinde güncellemeye gitti kararı",
    meta: "EPDK, doğal gaz dağıtım şirketlerinin yatırım tavanlarını ve LPG tesislerinin hizmet tarifelerini revize etti. Keyword: EPDK düzenleme",
    keyword: "EPDK düzenleme",
    lede: "EPDK düzenleme kapsamında tarifeler güncellendi.",
    sections: [{ heading: "Kapsam", paragraphs: ["Tarifeler güncellendi."], bullets: [] }],
    summary: ["a", "b", "c"], impact: "etki",
    faq: [{ q: "s1", a: "c1" }, { q: "s2", a: "c2" }, { q: "s3", a: "c3" }],
    claims: [], disclaimer: "Bu içerik yalnızca bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.",
  };
  const report = validateDraft(draft, packet);
  assert.ok(report.issues.some((issue) => issue.includes("etiket eki")));
});

test("kanıt kimlikleri okura giden metinden sökülür", () => {
  assert.equal(
    stripEvidenceMarkers("Açılış: 14.324,75 puan [ev-1-publisher:tgrt-haber-bist-100-gune]"),
    "Açılış: 14.324,75 puan",
  );
  assert.equal(
    stripEvidenceMarkers("Kâr arttı [ark-2-publisher:aa-koc] ve pay senedi yükseldi ."),
    "Kâr arttı ve pay senedi yükseldi.",
  );
  // Parantezsiz yazılan kimlik de temizlenir.
  assert.equal(stripEvidenceMarkers("Veri ev-3-publisher:dunya-borsa kaynaklı"), "Veri kaynaklı");
  // Normal metne dokunulmaz.
  assert.equal(stripEvidenceMarkers("Enflasyon yüzde 3,58 arttı."), "Enflasyon yüzde 3,58 arttı.");
});

// ── Kozmetik / esasa dair ayrımı ────────────────────────────────────────────
// 2 Eylül 2026: 181 karakterlik meta yüzünden bitmiş bir makale imha edildi.
// Kozmetik sorunlar makaleyi öldürmemeli, incelemeye göndermeli.

test("uzunluk ve kelime yerleşimi kozmetik olarak işaretlenir", () => {
  const draft = validDraft();
  draft.meta = `${draft.meta} Ek cümle kapı sınırını aşacak kadar uzatıyor bu metayı burada.`;
  const report = validateDraft(draft, packet);
  assert.equal(report.passed, false);
  assert.match(report.issues.join(" "), /Meta uzunluğu/);
  assert.deepEqual(report.issues, report.cosmeticIssues,
    "yalnızca kozmetik sorun varken listeler ayrışmamalı");
});

test("kaynakta olmayan rakam kozmetik SAYILMAZ", () => {
  const draft = validDraft();
  draft.claims[0] = { text: "Politika faizi yüzde 55 oldu.", kind: "FACT", evidenceIds: ["ev-yok"] };
  const report = validateDraft(draft, packet);
  assert.equal(report.passed, false);
  assert.equal(report.cosmeticIssues.length, 0,
    "esasa dair sorun kozmetik listeye girmemeli");
});

test("kozmetik ve esasa dair sorun birlikteyse makale kurtarılamaz", () => {
  const draft = validDraft();
  draft.meta = `${draft.meta} Ek cümle kapı sınırını aşacak kadar uzatıyor bu metayı burada.`;
  draft.claims[0] = { text: "Politika faizi yüzde 55 oldu.", kind: "FACT", evidenceIds: ["ev-1"] };
  const report = validateDraft(draft, packet);
  const yalnizcaKozmetik = report.issues.length > 0
    && report.issues.every((issue) => report.cosmeticIssues.includes(issue));
  assert.equal(yalnizcaKozmetik, false);
});

test("temiz taslakta kozmetik liste boştur", () => {
  const report = validateDraft(validDraft(), packet);
  assert.equal(report.passed, true);
  assert.equal(report.cosmeticIssues.length, 0);
});
