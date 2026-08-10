import assert from "node:assert/strict";
import test from "node:test";
import type { ArticleDraft } from "../lib/bot/article-schema";
import { renderDraftHtml, validateDraft } from "../lib/bot/quality";
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

test("HTML modelden değil güvenli renderer'dan ve kayıtlı kaynaklardan gelir", () => {
  const html = renderDraftHtml(validDraft(), packet);
  assert.match(html, /<h2>Kaynaklar<\/h2>/);
  assert.match(html, /https:\/\/example\.com\/bir/);
  assert.doesNotMatch(html, /<script>/i);
});
