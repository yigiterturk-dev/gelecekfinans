import { prisma } from "@/lib/db";
import type { EvidenceItem, EvidencePacket } from "./research";
import type { KeywordPick } from "./keywords";
import { acronymOf, normalizeEntityKey } from "./entities";

/**
 * Varlık konusu kurucusu — terfi etmiş "X kimdir" kelimesini yazılabilir hâle getirir.
 *
 * TEMEL KARAR: varlık makalesinin kanıtı DIŞARIDAN TOPLANMAZ. Kanıt, botun
 * daha önce yayımladığı ve o gün iki bağımsız kaynakla doğruladığı haberlerin
 * kanıt paketlerinden gelir. Sebebi tek cümleyle: gerçek bir kişi ya da şirket
 * hakkında yeni bir arama turu açmak, modelin belleğinden konuşmasına kapı
 * aralar; arşiv ise zaten hakemden geçmiş, kaynağı ve tarihi belli bir metin
 * yığınıdır. Bu yüzden burada tek bir ağ çağrısı yoktur — üretim bedava
 * malzemeyle başlar, para yalnızca yazara harcanır.
 *
 * İkinci karar: kanıt, varlığın ADININ GEÇTİĞİ kanıt parçalarıyla sınırlanır.
 * Bir haberin paketinde varlıkla ilgisiz üç kanıt daha olabilir; onları da
 * yollamak modele "bu adamla ilgili" diye alakasız olgular sunmak olurdu.
 */

/** Varlık makalesi için gereken en az kanıt metni. */
export const MIN_ENTITY_EVIDENCE_CHARS =
  Number(process.env.MIN_ENTITY_EVIDENCE_CHARS) || 1_200;

/**
 * Varlık yazısı için gereken en az bağımsız yayıncı sayısı.
 *
 * Haber şeridiyle AYNI eşik ve bu bilinçli: gerçek bir kişi hakkında tek
 * gazetenin tek cümlesine dayanarak künye yazmak, teknik olarak "kanıtlı"
 * olsa bile pratikte tek kaynağın hatasını sitenin kalıcı sayfasına çivilemek
 * demektir. Canlı ölçüm de bunu söylüyor: arşivde tek haberde geçen bir kişi
 * için toplanabilen malzeme bir alıntıdan ibaret kalıyor.
 */
export const MIN_ENTITY_PUBLISHERS = 2;

/** Modele gidecek en fazla kanıt parçası. */
const MAX_ENTITY_EVIDENCE_ITEMS = 8;

export interface EntitySourceArticle {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  publishedAt: Date | null;
  /** Kanıtta varlığı destekleyen cümle (EntityMention.excerpt). */
  excerpt: string | null;
  subject: boolean;
  evidence: EvidenceItem[];
}

export interface EntityTopic {
  keywordId: string;
  keyword: string;
  category: string;
  cluster: string;
  isHub: boolean;
  intent: string;
  evidencePacket: EvidencePacket;
  entity: { id: string; name: string; type: string; role: string | null; aliases: string[] };
  /** Varlığın geçtiği yayımlanmış haberler — iç linkleme ve "hangi haberde" bağlamı. */
  clusterArticles: Array<{ title: string; slug: string; isHub: boolean }>;
}

function mentionsEntity(text: string, names: string[]): boolean {
  const haystack = normalizeEntityKey(text);
  return names.some((name) => name.length > 2 && haystack.includes(name));
}

/**
 * Varlığın adının geçtiği kanıt parçalarını seçer, tekrarları eler ve yeniden
 * kimliklendirir.
 *
 * Yeniden kimliklendirme şart: kanıt kimlikleri kaynak makalenin kendi paketi
 * içinde benzersizdi, birleştirilmiş pakette çakışabilirler. Kalite kapısı
 * iddiaları kimlik üzerinden eşliyor; çakışan iki kimlik sessizce yanlış
 * kaynağa atıf demek olurdu.
 */
export function selectEntityEvidence(
  entity: { name: string; aliases?: string[] },
  articles: EntitySourceArticle[],
): EvidenceItem[] {
  const names = [entity.name, ...(entity.aliases ?? []), acronymOf(entity.name)]
    .map((value) => normalizeEntityKey(value))
    .filter(Boolean);

  const seen = new Set<string>();
  const picked: EvidenceItem[] = [];

  // Varlığın ÖZNE olduğu haberler önce: o haberlerin kanıtı doğrudan onu
  // anlatır, gövdede adı geçen haberlerinki ise yan bilgi taşır.
  const ordered = [...articles].sort((a, b) => {
    if (a.subject !== b.subject) return a.subject ? -1 : 1;
    return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
  });

  for (const article of ordered) {
    for (const item of article.evidence) {
      if (picked.length >= MAX_ENTITY_EVIDENCE_ITEMS) return picked;
      const text = `${item.title} ${item.summary} ${item.content || ""}`;
      if (!mentionsEntity(text, names)) continue;
      const dedupeKey = item.sourceUrl || `${item.publisherKey}:${item.title}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      picked.push({ ...item, id: `ark-${picked.length + 1}-${item.publisherKey}` });
    }
  }
  return picked;
}

function evidenceCharacters(evidence: EvidenceItem[]): number {
  return [...new Set(evidence.map((item) => item.content || item.summary || ""))].join(" ").length;
}

/** Yayımlanmış makalenin automationMeta alanından kanıt paketini güvenle çıkarır. */
export function readEvidenceFromMeta(meta: unknown): EvidenceItem[] {
  if (!meta || typeof meta !== "object") return [];
  const packet = (meta as { evidencePacket?: unknown }).evidencePacket;
  if (!packet || typeof packet !== "object") return [];
  const evidence = (packet as { evidence?: unknown }).evidence;
  if (!Array.isArray(evidence)) return [];
  return evidence.filter(
    (item): item is EvidenceItem =>
      Boolean(item) && typeof item === "object"
      && typeof (item as EvidenceItem).id === "string"
      && typeof (item as EvidenceItem).title === "string",
  );
}

export interface BuildEntityTopicOptions {
  /** Testlerde DB'yi atlamak için hazır malzeme. */
  source?: {
    entity: EntityTopic["entity"];
    articles: EntitySourceArticle[];
  };
}

/**
 * Terfi etmiş varlık kelimesini kanıtlı konuya çevirir.
 *
 * Kanıt yetersizse `status: "INSUFFICIENT"` döner; çağıran taraf modele hiç
 * gitmez. Varlık motorunun tamamı bedava çalışır, ilk kuruş burada geçilirse
 * harcanır.
 */
export async function buildEntityTopic(
  keyword: KeywordPick,
  options: BuildEntityTopicOptions = {},
): Promise<EntityTopic> {
  const source = options.source ?? (await loadEntitySource(keyword.id));

  const base = {
    keywordId: keyword.id,
    keyword: keyword.term,
    category: keyword.category,
    cluster: keyword.cluster,
    isHub: keyword.isHub,
    intent: keyword.intent,
  };

  if (!source) {
    return {
      ...base,
      entity: { id: "", name: keyword.term, type: "COMPANY", role: null, aliases: [] },
      clusterArticles: [],
      evidencePacket: {
        storyKey: `entity:${keyword.term}`,
        status: "INSUFFICIENT",
        independentSourceCount: 0,
        evidence: [],
        reasons: ["Kelimeye bağlı varlık kaydı bulunamadı"],
      },
    };
  }

  const evidence = selectEntityEvidence(source.entity, source.articles);
  const characters = evidenceCharacters(evidence);
  const publishers = new Set(evidence.map((item) => item.publisherKey));

  const reasons = [
    `${source.articles.length} arşiv haberinden ${evidence.length} kanıt parçası eşleşti`,
  ];
  if (!evidence.length) reasons.push("Varlığın adı hiçbir kanıt metninde geçmiyor");
  if (evidence.length && characters < MIN_ENTITY_EVIDENCE_CHARS) {
    reasons.push(`Kanıt metni kısa: ${characters}/${MIN_ENTITY_EVIDENCE_CHARS} karakter`);
  }
  if (evidence.length && publishers.size < MIN_ENTITY_PUBLISHERS) {
    reasons.push(`Bağımsız yayıncı yetersiz: ${publishers.size}/${MIN_ENTITY_PUBLISHERS}`);
  }

  const verified = evidence.length >= 1
    && characters >= MIN_ENTITY_EVIDENCE_CHARS
    && publishers.size >= MIN_ENTITY_PUBLISHERS;

  return {
    ...base,
    entity: source.entity,
    clusterArticles: source.articles
      .filter((article) => article.published)
      .map((article) => ({ title: article.title, slug: article.slug, isHub: false })),
    evidencePacket: {
      storyKey: `entity:${source.entity.id || keyword.term}`,
      status: verified ? "VERIFIED" : "INSUFFICIENT",
      independentSourceCount: publishers.size,
      evidence,
      reasons,
    },
  };
}

async function loadEntitySource(keywordId: string): Promise<BuildEntityTopicOptions["source"] | null> {
  const entity = await prisma.entity.findFirst({
    where: { keywordId },
    select: { id: true, name: true, type: true, role: true, aliases: true },
  });
  if (!entity) return null;
  return loadSourceForEntity(entity);
}

/**
 * Terfi etmemiş bir varlığın malzemesini de yükleyebilmek için ayrıldı:
 * teşhis scripti "bu varlık bugün terfi etse yazılabilir miydi?" sorusunu
 * yazar çağrısı yapmadan cevaplayabiliyor.
 */
export async function loadEntitySourceByName(
  name: string,
): Promise<BuildEntityTopicOptions["source"] | null> {
  const key = normalizeEntityKey(name);
  const entity = await prisma.entity.findFirst({
    where: { OR: [{ key }, { name: { contains: name, mode: "insensitive" } }] },
    select: { id: true, name: true, type: true, role: true, aliases: true },
  });
  if (!entity) return null;
  return loadSourceForEntity(entity);
}

async function loadSourceForEntity(entity: {
  id: string; name: string; type: unknown; role: string | null; aliases: string[];
}): Promise<NonNullable<BuildEntityTopicOptions["source"]>> {

  const mentions = await prisma.entityMention.findMany({
    where: { entityId: entity.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      excerpt: true,
      subject: true,
      article: {
        select: {
          id: true, title: true, slug: true, status: true,
          publishedAt: true, automationMeta: true,
        },
      },
    },
  });

  return {
    entity: { ...entity, type: String(entity.type) },
    articles: mentions.map((mention) => ({
      id: mention.article.id,
      title: mention.article.title,
      slug: mention.article.slug,
      published: mention.article.status === "PUBLISHED",
      publishedAt: mention.article.publishedAt,
      excerpt: mention.excerpt,
      subject: mention.subject,
      evidence: readEvidenceFromMeta(mention.article.automationMeta),
    })),
  };
}
