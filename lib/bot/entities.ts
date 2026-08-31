import { prisma } from "@/lib/db";
import type { ExtractedEntity } from "./writer";

/**
 * Varlık motoru — sitenin gerçekten sıralanabildiği sorgu tipini üreten katman.
 *
 * DAYANAK (uydurma değil, ölçüm): 2026-08-31 Search Console 90 günlük verisi.
 * Jenerik fiyat sorgularında site 75-90. sırada ve oradan çıkamıyor; buna
 * karşılık tek bir Midas/Egem Eraslan haberi "midas kurucu" 12., "midasın
 * sahibi kim" 20., "egem eraslan kimdir" 26. sırada. Aradaki fark rekabet:
 * "dolar kuru"nda ulusal gazetelerle, "midas kurucu"da neredeyse kimseyle
 * yarışmıyorsun. Bu modül o kazayı tekrar edilebilir hale getirir.
 *
 * ⚠️ TEMEL KURAL: varlık YALNIZCA botun doğruladığı bir haberin kanıt
 * paketinden çıkar. Gerçek kişi ve şirket hakkında kanıtsız cümle kurmak
 * YMYL ihlalidir; bir tane uydurma "X'in sahibi Y'dir" hem AdSense'i hem
 * alan adının itibarını kalıcı olarak yakar. Bu yüzden aşağıda modelin
 * döndürdüğü her varlık, kanıt metnine karşı yeniden doğrulanır.
 */

/** Bir varlık kaç ayrı yayımlanmış makalede geçerse "X kimdir" yazılmaya değer. */
export const ENTITY_PROMOTION_THRESHOLD =
  Number(process.env.ENTITY_PROMOTION_THRESHOLD) || 2;

/**
 * Varlık sayılmayacak adlar. Model kurala rağmen bunları ara sıra döndürüyor
 * ve bunlar tam olarak sitenin YARIŞAMADIĞI jenerik sorgular — havuza
 * girerlerse motor kendi amacını baltalar.
 */
const GENERIC_TERMS = new Set([
  "dolar", "euro", "avro", "sterlin", "altın", "gram altın", "ons altın",
  "bitcoin", "ethereum", "kripto para", "bist", "bist 100", "borsa istanbul endeksi",
  "türk lirası", "tl", "usd", "eur", "faiz", "enflasyon", "abd doları",
  "petrol", "brent", "gümüş", "nasdaq", "s&p 500", "dow jones",
]);

/**
 * Türkçe'ye duyarlı normalleştirme. "İ" harfinin küçüğü "i" değil "i̇"
 * olduğu için düz toLowerCase() aynı şirketi iki ayrı varlık yapıyordu.
 */
export function normalizeEntityKey(value: string): string {
  return value
    .replace(/İ/g, "i").replace(/I/g, "ı")
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (ch) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" }[ch] || ch))
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Modelin döndürdüğü varlığı kanıt metnine karşı doğrular.
 *
 * İki koşul birden aranır: (1) alıntı gerçekten kanıtta geçmeli, (2) varlığın
 * adı o alıntının içinde geçmeli. Model uydurduğunda ikisinden biri mutlaka
 * tutmaz — "halüsinasyonu kanıta bağlama" testinin ucuz ve kesin hâli budur.
 */
export function isGroundedInEvidence(
  entity: ExtractedEntity,
  evidenceText: string,
): boolean {
  const haystack = normalizeEntityKey(evidenceText);
  const excerpt = normalizeEntityKey(entity.excerpt);
  const name = normalizeEntityKey(entity.name);
  if (!name || name.length < 2) return false;
  if (GENERIC_TERMS.has(name)) return false;
  // Alıntı kanıtta birebir geçmeli. Model kısaltma/yeniden yazma yaptıysa
  // güvenilirliği zaten şüphelidir; sıkı davranmak doğru taraf.
  if (excerpt.length < 10 || !haystack.includes(excerpt)) return false;
  // Ad, alıntının içinde geçmeli — yoksa alıntı başka bir cümleden alınmış demektir.
  return excerpt.includes(name);
}

/**
 * Haberi YAYIMLAYAN kuruluşlar. Kanıt metninde adları sık geçtiği için model
 * bunları düzenli olarak varlık sanıyor — oysa bunlar haberin kaynağı, konusu
 * değil. "Anadolu Ajansı nedir, sahibi kim" hem okura değersiz hem de sitenin
 * hiç yarışamayacağı bir sorgu.
 */
const PUBLISHER_TERMS = new Set([
  "anadolu ajansi", "aa", "iha", "dha", "reuters", "bloomberg", "bloomberg ht",
  "takvim", "internet haber", "yeni mesaj", "bigpara", "hurriyet", "milliyet",
  "sabah", "sozcu", "cumhuriyet", "haberturk", "ntv", "cnn turk", "trt",
  "trt haber", "dunya", "ekonomim", "patronlar dunyasi", "sondakika",
  "mynet", "haber7", "star", "aksam", "yeni safak", "karar", "t24",
]);

/**
 * Adın kısaltmasını üretir: "Enerji Piyasası Düzenleme Kurumu" → "epdk".
 * Manşetler kurumları kısaltmayla yazıyor, model ise açık adı döndürüyor;
 * bu eşleşme olmadan EPDK kendi haberinin öznesi sayılmıyordu.
 */
export function acronymOf(name: string): string {
  const words = normalizeEntityKey(name).split(" ").filter((w) => w.length > 1);
  if (words.length < 2) return "";
  return words.map((w) => w[0]).join("");
}

/**
 * BIST hisse kodu kalıbı: boşluksuz, 4-6 harf, tamamı büyük ("THYAO",
 * "SUNTK", "ESCOM", "TUPRS", "ASELS"). Bunlar "günün en çok yükselenleri"
 * listelerinden kopuyor ve haklarında "listede vardı"dan başka bilgi yok.
 */
export function looksLikeTicker(name: string): boolean {
  return /^[A-ZÇĞİÖŞÜ]{4,6}$/.test(name.trim());
}

/**
 * Alıntının bir LİSTE cümlesi olup olmadığı. Piyasa özetleri onlarca adı
 * virgülle sıralıyor; böyle bir cümle varlık hakkında hiçbir şey söylemez.
 */
export function looksLikeEnumeration(excerpt: string): boolean {
  const commas = (excerpt.match(/,/g) || []).length;
  const percents = (excerpt.match(/%/g) || []).length;
  return commas >= 3 || percents >= 2;
}

/**
 * Varlığın haberin ÖZNESİ olup olmadığı — adı ya da kısaltması manşette
 * veya kanıt başlıklarında geçiyor mu.
 *
 * Bu artık kayıt için ŞART DEĞİL, terfi için şart. Neden değiştirildi: ilk
 * sürümde manşet şartı kayıt anında uygulanıyordu ve Koç Holding bilanço
 * haberinden Levent Çakıroğlu, Tüpraş, Ford Otosan, Arçelik gibi gerçek
 * özneleri eliyordu — oysa "levent çakıroğlu kimdir" tam olarak sitenin
 * kazanabildiği sorgu tipi. Doğru yer terfi kapısı: gürültüyü zaten
 * "2 ayrı haberde geçmeli" eşiği süzüyor.
 */
export function isStorySubject(
  name: string,
  headline: string,
  evidenceTitles: string[],
): boolean {
  const key = normalizeEntityKey(name);
  if (!key) return false;
  const scope = [headline, ...evidenceTitles].map(normalizeEntityKey).join(" | ");
  if (scope.includes(key)) return true;
  const acronym = acronymOf(name);
  return acronym.length >= 3 && scope.includes(acronym);
}

/**
 * Kayıt kapısı: açıkça çöp olanı ele, gerisini geçir. Sıkı eleme terfide.
 */
export function isRecordableEntity(entity: ExtractedEntity): { ok: boolean; reason?: string } {
  const key = normalizeEntityKey(entity.name);
  if (PUBLISHER_TERMS.has(key)) return { ok: false, reason: "yayıncı" };
  if (looksLikeTicker(entity.name)) return { ok: false, reason: "hisse kodu" };
  if (looksLikeEnumeration(entity.excerpt)) return { ok: false, reason: "liste cümlesi" };
  return { ok: true };
}

export interface RecordEntitiesResult {
  recorded: number;
  rejected: number;
  rejectedNames: string[];
}

/**
 * Doğrulamayı geçen varlıkları kaydeder ve makaleyle ilişkilendirir.
 * `mentions` sayacı yalnızca YENİ bir makale bağı kurulduğunda artar; aynı
 * makale iki kez işlenirse sayaç şişmez (terfi eşiği buna güveniyor).
 */
export async function recordEntities(
  articleId: string,
  category: string | null,
  entities: ExtractedEntity[],
  evidenceText: string,
  headline = "",
  evidenceTitles: string[] = [],
): Promise<RecordEntitiesResult> {
  const result: RecordEntitiesResult = { recorded: 0, rejected: 0, rejectedNames: [] };
  const seen = new Set<string>();

  for (const entity of entities) {
    const key = normalizeEntityKey(entity.name);
    if (seen.has(key)) continue;
    seen.add(key);

    if (!isGroundedInEvidence(entity, evidenceText)) {
      result.rejected++;
      result.rejectedNames.push(`${entity.name} (kanıtsız)`);
      continue;
    }
    const kayit = isRecordableEntity(entity);
    if (!kayit.ok) {
      result.rejected++;
      result.rejectedNames.push(`${entity.name} (${kayit.reason})`);
      continue;
    }
    const ozne = headline ? isStorySubject(entity.name, headline, evidenceTitles) : false;

    const existing = await prisma.entity.findUnique({ where: { key }, select: { id: true, aliases: true } });
    const entityId = existing
      ? existing.id
      : (await prisma.entity.create({
          data: { key, name: entity.name.trim(), type: entity.type, role: entity.role, category },
        })).id;

    if (existing && !existing.aliases.includes(entity.name.trim()) && entity.name.trim() !== entity.name) {
      await prisma.entity.update({
        where: { id: entityId },
        data: { aliases: { push: entity.name.trim() } },
      });
    }

    const mention = await prisma.entityMention.findUnique({
      where: { entityId_articleId: { entityId, articleId } },
      select: { id: true },
    });
    if (!mention) {
      await prisma.entityMention.create({
        data: { entityId, articleId, excerpt: entity.excerpt, subject: ozne },
      });
      await prisma.entity.update({
        where: { id: entityId },
        data: { mentions: { increment: 1 }, ...(ozne ? { subjectMentions: { increment: 1 } } : {}) },
      });
    }
    result.recorded++;
  }
  return result;
}

/**
 * Varlığın adından yazılacak sorgu kalıbını üretir.
 *
 * Kalıp tipe göre değişir çünkü insanlar kişiyi ve şirketi farklı arıyor:
 * GSC verisinde kişi için "egem eraslan kimdir", şirket için "midasın sahibi
 * kim" ve "midas kurucu" görüldü.
 */
export function entityKeywordTerm(name: string, type: string): string {
  const clean = name.trim();
  if (type === "PERSON") return `${clean} kimdir`;
  return `${clean} nedir, sahibi kim`;
}

export interface PromotionResult {
  promoted: Array<{ name: string; term: string }>;
  skipped: number;
}

/**
 * Eşiği aşan varlıkları kelime havuzuna taşır — Şerit B onları normal rehber
 * kuyruğu gibi yazar, ama kanıtı `buildEntityTopic` ile haber arşivinden gelir.
 */
export async function promoteEntitiesToKeywords(
  threshold: number = ENTITY_PROMOTION_THRESHOLD,
): Promise<PromotionResult> {
  const candidates = await prisma.entity.findMany({
    // İki şart birden: yeterince tekrar etmiş VE en az bir kez haberin
    // öznesi olmuş. Sadece eşiğe bakmak, piyasa özetlerinin gövdesinde
    // sürekli adı geçen ama hakkında yazacak bilgimiz olmayan varlıkları
    // terfi ettiriyordu.
    where: { status: "OBSERVED", mentions: { gte: threshold }, subjectMentions: { gte: 1 } },
    orderBy: { mentions: "desc" },
    take: 25,
  });

  const promoted: PromotionResult["promoted"] = [];
  let skipped = 0;

  for (const entity of candidates) {
    const term = entityKeywordTerm(entity.name, entity.type);
    const exists = await prisma.keyword.findUnique({ where: { term }, select: { id: true } });
    if (exists) {
      await prisma.entity.update({
        where: { id: entity.id },
        data: { status: "PROMOTED", keywordId: exists.id },
      });
      skipped++;
      continue;
    }
    const keyword = await prisma.keyword.create({
      data: {
        term,
        category: entity.category || "ekonomi",
        cluster: `varlik-${entity.key.replace(/\s+/g, "-")}`,
        isHub: false,
        intent: "INFORMATIONAL",
        // Varlık kelimeleri tohum kelimelerin ÜSTÜNDE: ölçülmüş kazanan
        // sorgu tipi bunlar, tohumlar ise hâlâ varsayım.
        priority: 90,
        origin: "entity",
        notes: `${entity.mentions} haberde geçti · ${entity.role || ""}`.trim(),
      },
    });
    await prisma.entity.update({
      where: { id: entity.id },
      data: { status: "PROMOTED", keywordId: keyword.id },
    });
    promoted.push({ name: entity.name, term });
  }
  return { promoted, skipped };
}
