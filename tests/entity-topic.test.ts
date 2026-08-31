import assert from "node:assert/strict";
import test from "node:test";
import {
  MIN_ENTITY_EVIDENCE_CHARS,
  MIN_ENTITY_PUBLISHERS,
  buildEntityTopic,
  readEvidenceFromMeta,
  selectEntityEvidence,
  type EntitySourceArticle,
} from "../lib/bot/entity-topic";
import { linkEntitySources } from "../lib/bot/linker";
import type { EvidenceItem } from "../lib/bot/research";
import type { KeywordPick } from "../lib/bot/keywords";

/**
 * Varlık konusu kurucusunun sözleşmesi tek cümlede: gerçek bir kişi/şirket
 * hakkında yazılacak her cümlenin arkasında, arşivde adı geçen doğrulanmış bir
 * haber olmalı. Aşağıdaki testler bu sözleşmenin ihlal edilebileceği dört yeri
 * kapatıyor — alakasız kanıt, çakışan kimlik, yetersiz malzeme, kayıp varlık.
 */

function evidence(overrides: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    id: "ev-1-aa",
    title: "Midas ödeme sistemleri işine giriyor",
    summary: "Aracı kurum Midas, ödeme hizmetleri alanına gireceğini duyurdu.",
    source: "Anadolu Ajansı",
    sourceUrl: "https://example.com/midas-odeme",
    publisherKey: "aa",
    publishedAt: "2026-08-01",
    sourceScore: 92,
    content: "Midas kurucu ortağı Egem Eraslan, şirketin ödeme sistemleri işine gireceğini açıkladı. ".repeat(20),
    ...overrides,
  };
}

function article(overrides: Partial<EntitySourceArticle> = {}): EntitySourceArticle {
  return {
    id: "a1",
    title: "Midas ödeme sistemleri işine giriyor",
    slug: "midas-odeme-sistemleri",
    published: true,
    publishedAt: new Date("2026-08-01"),
    excerpt: "Midas kurucu ortağı Egem Eraslan açıkladı.",
    subject: true,
    evidence: [evidence()],
    ...overrides,
  };
}

const keyword: KeywordPick = {
  id: "k1", term: "Midas nedir, sahibi kim", category: "ekonomi",
  cluster: "varlik-midas", isHub: false, intent: "INFORMATIONAL",
  priority: 90, origin: "entity",
};

test("varlığın adı geçmeyen kanıt pakete alınmaz", () => {
  const picked = selectEntityEvidence({ name: "Midas" }, [
    article({
      evidence: [
        evidence(),
        evidence({
          id: "ev-2-ntv",
          title: "Merkez Bankası faiz kararını açıkladı",
          summary: "Politika faizi sabit bırakıldı.",
          sourceUrl: "https://example.com/faiz",
          publisherKey: "ntv",
          content: "Politika faizi değişmedi.",
        }),
      ],
    }),
  ]);
  assert.equal(picked.length, 1);
  assert.match(picked[0].title, /Midas/);
});

test("kanıt kimlikleri birleştirilmiş pakette çakışmaz", () => {
  // İki ayrı haberin paketinde de "ev-1-aa" kimliği var; birleştirilince
  // aynı kimlik iki farklı kaynağı gösterirse kalite kapısı yanlış eşler.
  const picked = selectEntityEvidence({ name: "Midas" }, [
    article(),
    article({
      id: "a2",
      slug: "midas-yeni-yatirim",
      publishedAt: new Date("2026-08-10"),
      evidence: [evidence({ sourceUrl: "https://example.com/midas-yatirim", publisherKey: "dunya" })],
    }),
  ]);
  assert.equal(picked.length, 2);
  assert.equal(new Set(picked.map((item) => item.id)).size, 2);
});

test("aynı kaynak iki haberde geçse bile tek kez eklenir", () => {
  const picked = selectEntityEvidence({ name: "Midas" }, [article(), article({ id: "a2", slug: "b" })]);
  assert.equal(picked.length, 1);
});

test("kısaltma ve takma adla eşleşme tutar", () => {
  const picked = selectEntityEvidence(
    { name: "Enerji Piyasası Düzenleme Kurumu", aliases: ["EPDK"] },
    [article({
      evidence: [evidence({
        title: "EPDK tarife kararını yayımladı",
        summary: "Kurum yeni tarifeyi duyurdu.",
        content: "EPDK tarafından yayımlanan karar yürürlüğe girdi. ".repeat(20),
      })],
    })],
  );
  assert.equal(picked.length, 1);
});

test("malzeme eşiğin altındaysa konu INSUFFICIENT döner ve modele gidilmez", async () => {
  const topic = await buildEntityTopic(keyword, {
    source: {
      entity: { id: "e1", name: "Midas", type: "COMPANY", role: "aracı kurum", aliases: [] },
      articles: [article({ evidence: [evidence({ content: "Midas kısa haber." })] })],
    },
  });
  assert.equal(topic.evidencePacket.status, "INSUFFICIENT");
  assert.ok(topic.evidencePacket.reasons.some((reason) => reason.includes(String(MIN_ENTITY_EVIDENCE_CHARS))));
});

test("yeterli arşiv malzemesiyle konu VERIFIED olur ve yayımlanmış haberlere bağlanır", async () => {
  const topic = await buildEntityTopic(keyword, {
    source: {
      entity: { id: "e1", name: "Midas", type: "COMPANY", role: "aracı kurum", aliases: [] },
      articles: [
        article(),
        article({
          id: "a2", slug: "midas-taslak", published: false, subject: false,
          evidence: [evidence({ sourceUrl: "https://example.com/midas-2", publisherKey: "dunya", source: "Dünya" })],
        }),
      ],
    },
  });
  assert.equal(topic.evidencePacket.status, "VERIFIED");
  assert.equal(topic.evidencePacket.independentSourceCount, 2);
  // Taslak makale iç linke girmez: yayımlanmamış sayfaya link 404 üretir.
  assert.deepEqual(topic.clusterArticles.map((item) => item.slug), ["midas-odeme-sistemleri"]);
});

test("tek yayıncıya dayanan varlık yazılmaz", async () => {
  // Gerçek kişi hakkında tek gazetenin tek cümlesine dayanarak künye yazmak,
  // o kaynağın hatasını sitenin kalıcı sayfasına çivilemek demektir.
  const topic = await buildEntityTopic(keyword, {
    source: {
      entity: { id: "e1", name: "Midas", type: "COMPANY", role: null, aliases: [] },
      articles: [article()],
    },
  });
  assert.equal(topic.evidencePacket.status, "INSUFFICIENT");
  assert.ok(topic.evidencePacket.reasons.some((reason) => reason.includes(String(MIN_ENTITY_PUBLISHERS))));
});

test("varlık kaydı yoksa konu sessizce üretilmez", async () => {
  const topic = await buildEntityTopic(keyword, {
    source: undefined as never,
  }).catch(() => null);
  // source verilmediğinde DB'ye gider; burada yalnızca sözleşmeyi belgeliyoruz:
  // DB'siz ortamda çağrı ya hata verir ya da INSUFFICIENT döner, ASLA yazmaz.
  if (topic) assert.notEqual(topic.evidencePacket.status, "VERIFIED");
});

test("automationMeta bozuksa kanıt okuma çökmez", () => {
  assert.deepEqual(readEvidenceFromMeta(null), []);
  assert.deepEqual(readEvidenceFromMeta({ evidencePacket: { evidence: "yok" } }), []);
  assert.equal(readEvidenceFromMeta({ evidencePacket: { evidence: [evidence()] } }).length, 1);
});

test("varlık yazısı çıktığı haberlere link verir, kendine vermez", () => {
  const html = linkEntitySources(
    "<p>Midas hakkında.</p>",
    [{ title: "Midas ödeme sistemleri", slug: "midas-odeme" }, { title: "Kendisi", slug: "midas-nedir" }],
    "midas-nedir",
  );
  assert.match(html, /href="\/midas-odeme"/);
  assert.doesNotMatch(html, /href="\/midas-nedir"/);
});
