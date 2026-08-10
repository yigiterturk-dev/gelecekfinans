import assert from "node:assert/strict";
import test from "node:test";
import { checkPlagiarism } from "../lib/bot/plagiarism";
import type { EvidencePacket } from "../lib/bot/research";

const copiedSentence = "Merkez Bankası kurul toplantısında politika faizini mevcut seviyesinde sabit tutma kararı aldığını kamuoyuna duyurdu";
const packet: EvidencePacket = {
  storyKey: "faiz-karari",
  status: "VERIFIED",
  independentSourceCount: 2,
  reasons: [],
  evidence: [
    {
      id: "ev-1",
      title: "Faiz kararı açıklandı",
      summary: `${copiedSentence}. Kararın ayrıntıları resmi açıklamada yer aldı.`,
      source: "Kaynak Bir",
      sourceUrl: "https://example.com/1",
      publisherKey: "publisher:bir",
      publishedAt: null,
      sourceScore: 90,
    },
    {
      id: "ev-2",
      title: "Politika faizi sabit kaldı",
      summary: "İkinci yayıncı da kurulun faiz oranını değiştirmediğini bildirdi.",
      source: "Kaynak İki",
      sourceUrl: "https://example.org/2",
      publisherKey: "publisher:iki",
      publishedAt: null,
      sourceScore: 80,
    },
  ],
};

test("kaynak cümlesini aynen taşıyan taslak bloke edilir", () => {
  const report = checkPlagiarism({
    candidate: `<p>Gelişme duyuruldu.</p><p>${copiedSentence}.</p>`,
    evidencePacket: packet,
  });
  assert.equal(report.passed, false);
  assert.equal(report.matches[0].type, "SOURCE");
  assert.ok(report.matches[0].longestExactRun >= 14);
});

test("aynı olguyu özgün cümlelerle özetleyen taslak geçer", () => {
  const report = checkPlagiarism({
    candidate: "TCMB, toplantı sonrasında faiz oranında değişiklik yapmadığını açıkladı. Karar mevcut oranın korunması anlamına geliyor.",
    evidencePacket: packet,
  });
  assert.equal(report.passed, true, report.issues.join("; "));
});

test("yakın dönem arşivindeki paragrafı yeniden kullanan taslak bloke edilir", () => {
  const archiveText = "Kararın ardından finansal koşulların mevcut görünümü korunurken bankacılık sistemindeki gelişmeler yakından izlenmeye devam edecek";
  const report = checkPlagiarism({
    candidate: `<p>${archiveText} ve yeni veriler ayrıca değerlendirilecek.</p>`,
    evidencePacket: packet,
    recentDocuments: [{ id: "old-1", title: "Eski haber", content: `<p>${archiveText}.</p>` }],
  });
  assert.equal(report.passed, false);
  assert.equal(report.matches.at(-1)?.type, "INTERNAL");
});

