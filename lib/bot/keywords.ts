import { prisma } from "@/lib/db";
import { KEYWORD_SEED, type SeedKeyword } from "@/lib/bot/keyword-seed";

/**
 * Anahtar kelime havuzu — Şerit B'nin konu kaynağı.
 *
 * Haber şeridinin aksine konu dışarıdan (RSS) gelmez, buradan seçilir.
 * Seçim sırası kasıtlı olarak deterministik: önce hub sayfaları, sonra
 * öncelik, sonra en az denenmiş olan. Rastgelelik yok — aynı kelimenin
 * üst üste model kredisi yakması istenmiyor.
 */

/** Bir kelime kaç başarısız denemeden sonra kuyruktan düşürülür. */
export const MAX_KEYWORD_ATTEMPTS = 3;

/**
 * Başarısız denemeden sonra kelimenin yeniden denenebilmesi için geçmesi
 * gereken süre. Aynı koşuda ya da aynı gün içinde tekrar denemek, arıza
 * kalıcıysa (kanıt bulunamıyor gibi) sadece kredi yakar.
 */
export const KEYWORD_COOLDOWN_HOURS = Number(process.env.KEYWORD_COOLDOWN_HOURS) || 24;

/**
 * Varlık ("X nedir, sahibi kim") kelimeleri için ayrı ve uzun bekleme.
 *
 * NEDEN (2026-11-01 canlı ölçüm): kuyrukta 47 varlık kelimesi vardı ve hepsi
 * 90 önceliğiyle, 39 yazılabilir tohum rehberinin ÖNÜNE geçiyordu. Varlık
 * kanıtı botun kendi arşivinden geldiği için malzeme yeni haber yayımlandıkça
 * birikir; 24 saat sonra tekrar denemek aynı boş arşivi yeniden okumaktan
 * başka bir şey yapmıyor. Günlük rehber kotası böylece haftalarca boşa gitti.
 *
 * Bir hafta bekleme, yeni varlık geçen haberlerin arşive düşmesi için makul
 * süre; bu sırada tohum rehberler (uzun kuyruk) yazılır.
 */
export const ENTITY_KEYWORD_COOLDOWN_HOURS =
  Number(process.env.ENTITY_KEYWORD_COOLDOWN_HOURS) || 168;

export interface SeedResult {
  created: number;
  updated: number;
  total: number;
}

/**
 * Tohum listesini havuza yazar. Tekrar çalıştırılabilir: var olan kelimenin
 * yalnızca sınıflandırma alanları güncellenir, ilerleme durumu (status,
 * articleId, attempts) korunur — yoksa yayımlanmış bir rehber yeniden
 * kuyruğa girip ikinci kez yazılırdı.
 */
export async function seedKeywords(seed: SeedKeyword[] = KEYWORD_SEED): Promise<SeedResult> {
  let created = 0;
  let updated = 0;
  for (const item of seed) {
    const existing = await prisma.keyword.findUnique({
      where: { term: item.term },
      select: { id: true },
    });
    const classification = {
      category: item.category,
      cluster: item.cluster,
      isHub: item.isHub ?? false,
      intent: item.intent ?? "INFORMATIONAL",
      priority: item.priority ?? 50,
    } as const;
    if (existing) {
      await prisma.keyword.update({ where: { id: existing.id }, data: classification });
      updated++;
    } else {
      await prisma.keyword.create({
        data: { term: item.term, origin: "seed", ...classification },
      });
      created++;
    }
  }
  return { created, updated, total: seed.length };
}

export interface KeywordPick {
  id: string;
  term: string;
  category: string;
  cluster: string;
  isHub: boolean;
  intent: string;
  priority: number;
  /** "seed" | "gsc" | "entity" — hangi kaynaktan geldiği; şerit seçimini belirler. */
  origin: string;
}

/**
 * Sıradaki yazılacak kelimeleri getirir.
 *
 * Hub önceliği bilinçli: spoke makaleler hub'a link verecek, hub yoksa
 * bağlanacak hedef de yok. Aynı kümeden bir koşuda en fazla bir kelime
 * alınır ki tek gün içinde tek küme şişmesin, kategori çeşitliliği korunsun.
 */
export async function pickKeywords(limit = 1, category?: string): Promise<KeywordPick[]> {
  /**
   * Bekleme süresi DB'de değil aşağıdaki saf fonksiyonda uygulanıyor: varlık ve
   * tohum kelimelerin süreleri FARKLI. Tek bir `lastTriedAt < cooldown`
   * filtresi ikisini aynı kefeye koyduğu için varlık kelimeleri her gün
   * kuyruğun başına dönüyordu.
   *
   * Sorgu ikiye ayrıldı çünkü tek sorguda `take` sınırı varlık kelimeleriyle
   * dolabiliyor (hepsi yüksek öncelikli): arkadaki tohum rehberler hiç
   * görülmeden boş seçim dönüyordu. Gruplar ayrı çekilip birleştiriliyor,
   * sıralama ortak karşılaştırıcıyla korunuyor.
   */
  const where = {
    status: "QUEUED" as const,
    attempts: { lt: MAX_KEYWORD_ATTEMPTS },
    ...(category ? { category } : {}),
  };
  const orderBy = [
    { isHub: "desc" as const },
    { priority: "desc" as const },
    { attempts: "asc" as const },
    { createdAt: "asc" as const },
  ];
  const select = {
    id: true, term: true, category: true, cluster: true,
    isHub: true, intent: true, priority: true, origin: true,
    attempts: true, lastTriedAt: true, createdAt: true,
  };

  const perGroup = Math.max(limit * 8, 24);
  const [organic, entities] = await Promise.all([
    prisma.keyword.findMany({ where: { ...where, origin: { not: "entity" } }, orderBy, take: perGroup, select }),
    prisma.keyword.findMany({ where: { ...where, origin: "entity" }, orderBy, take: perGroup, select }),
  ]);

  const candidates = [...organic, ...entities].sort(compareKeywordCandidates);

  return selectKeywordCandidates(candidates, limit);
}

export interface KeywordOrderable {
  isHub: boolean;
  origin: string;
  priority: number;
  attempts: number;
  createdAt: Date;
}

/**
 * Kuyruk sırası: hub → tohum/GSC → varlık → öncelik → az denenmiş.
 *
 * NEDEN VARLIK EN SONDA (1 Kasım 2026 ölçümü): 45 varlık kelimesi hiç
 * denenmemiş olduğu için `lastTriedAt` boştu ve 90 önceliğiyle 39 yazılabilir
 * tohum rehberinin hepsinin önüne geçiyordu. Varlık kanıtı arşivde birikmedikçe
 * yazılamıyor; tohum rehber ise hemen yazılabilir ve uzun kuyruk talebini
 * hedefliyor. Varlık kelimeleri kaybolmuyor — tohum kuyruğu biterse ya da
 * varlık gerçekten olgunlaşırsa (`isHub`) yine seçilir.
 */
export function compareKeywordCandidates(a: KeywordOrderable, b: KeywordOrderable): number {
  if (a.isHub !== b.isHub) return a.isHub ? -1 : 1;
  const entityRank = (item: KeywordOrderable) => (item.origin === "entity" ? 1 : 0);
  if (entityRank(a) !== entityRank(b)) return entityRank(a) - entityRank(b);
  if (a.priority !== b.priority) return b.priority - a.priority;
  if (a.attempts !== b.attempts) return a.attempts - b.attempts;
  return a.createdAt.getTime() - b.createdAt.getTime();
}

export interface KeywordCandidate extends KeywordPick {
  lastTriedAt: Date | null;
}

/**
 * Aday listesinden yazılacak kelimeleri seçer (DB'siz, saf).
 *
 * Kurallar, öncelik sırasıyla:
 *  1. Bekleme süresi dolmamış kelime atlanır. Süre kaynağa göre değişir:
 *     varlık kelimeleri `ENTITY_KEYWORD_COOLDOWN_HOURS`, diğerleri
 *     `KEYWORD_COOLDOWN_HOURS`.
 *  2. Aynı kümeden bir koşuda en fazla bir kelime alınır.
 *
 * Girdi sırası çağıran tarafından belirlenir (hub → öncelik → az denenmiş).
 */
export function selectKeywordCandidates(
  candidates: KeywordCandidate[],
  limit: number,
  now: Date = new Date(),
): KeywordPick[] {
  const standardCutoff = now.getTime() - KEYWORD_COOLDOWN_HOURS * 60 * 60 * 1000;
  const entityCutoff = now.getTime() - ENTITY_KEYWORD_COOLDOWN_HOURS * 60 * 60 * 1000;

  const picked: KeywordPick[] = [];
  const usedClusters = new Set<string>();
  for (const candidate of candidates) {
    if (picked.length >= limit) break;
    if (candidate.lastTriedAt) {
      const cutoff = candidate.origin === "entity" ? entityCutoff : standardCutoff;
      if (candidate.lastTriedAt.getTime() >= cutoff) continue;
    }
    if (usedClusters.has(candidate.cluster)) continue;
    usedClusters.add(candidate.cluster);
    const { lastTriedAt: _lastTriedAt, ...pick } = candidate;
    picked.push(pick);
  }
  return picked;
}

/** Kelime yazıma alındığında çağrılır; aynı kelimenin paralel işlenmesini önler. */
export async function markKeywordInProgress(id: string): Promise<void> {
  await prisma.keyword.update({
    where: { id },
    data: { status: "IN_PROGRESS", lastTriedAt: new Date(), attempts: { increment: 1 } },
  });
}

export async function markKeywordPublished(id: string, articleId: string): Promise<void> {
  await prisma.keyword.update({
    where: { id },
    data: { status: "PUBLISHED", articleId, lastError: null },
  });
}

/**
 * ── İNCELEMEDEKİ TASLAK KUYRUĞA GERİ DÖNMEZ ────────────────────────────────
 *
 * CANLI ARIZA (3 Eylül 2026, koşu cmtlye9m20000l804g9h7u13k): "enflasyon nedir
 * nasıl hesaplanır" rehberi 2 Eylül'de yazıldı, doğrulayıcı itiraz etti,
 * taslağa kurtarıldı ve panelden onaylanıp YAYINA çıktı. Ama kurtarma yolu
 * kelimeyi işaretlemiyordu: `markKeywordFailed` onu QUEUED'a geri koyuyordu.
 * Bot 3 Eylül'de aynı rehberi BAŞTAN yazdı — hem ikinci bir ücretli çağrı
 * harcandı hem de ortaya aynı anahtar kelimede birbirini yiyen iki makale
 * çıktı (yeni taslak kendi selefine iç bağlantı bile veriyordu).
 *
 * İnceleme bekleyen taslağı olan kelime PAUSED olur: kuyruktan çıkar ama
 * panel sayacında görünür ve `lastError` neden beklediğini söyler.
 */
export async function markKeywordInReview(
  id: string,
  articleId: string,
  reason: string,
): Promise<void> {
  await prisma.keyword.update({
    where: { id },
    data: { status: "PAUSED", articleId, lastError: `İncelemede: ${reason}`.slice(0, 500) },
  });
}

/**
 * Başarısız denemede kelime kuyruğa geri döner; deneme hakkı bittiyse FAILED
 * olur. FAILED kelime sessizce kaybolmaz — admin panelinde neden başarısız
 * olduğu `lastError` alanında durur, elle düzeltilip kuyruğa alınabilir.
 */
/**
 * Kelimeyi başarısız işaretler.
 *
 * 🔴 YAYINLANMIŞ KELİMEYİ ASLA GERİ ALMAZ. Canlı kayıttan (3 Eylül): "altın
 * yatırımı nasıl yapılır" makalesi 08:39'da YAYINLANDI ve kelimeye bağlandı,
 * buna rağmen kelime FAILED + 3 deneme olarak duruyordu. Sebep: orchestrator'ın
 * `catch` bloğu koşulsuz bu fonksiyonu çağırıyor; makale yayımlandıktan SONRA
 * herhangi bir adım (olay kaydı, dizin bildirimi) hata verirse kelime
 * PUBLISHED'dan düşürülüyordu. Sonuç: istatistik yalan söylüyor ve kelime
 * havuzu gerçekte üretilmiş içeriği "başarısız" sayıyor.
 *
 * Koruma çağıran tarafta değil BURADA: hangi yoldan gelinirse gelinsin
 * yayınlanmış bir kelimenin durumu geri alınamaz. Hata yine de `lastError`
 * alanına yazılır — bilgi kaybolmasın, sadece durum bozulmasın.
 */
export async function markKeywordFailed(id: string, error: string): Promise<void> {
  const current = await prisma.keyword.findUnique({
    where: { id },
    select: { attempts: true, status: true },
  });
  if (current?.status === "PUBLISHED") {
    await prisma.keyword.update({
      where: { id },
      data: { lastError: `(yayın sonrası hata, durum korundu) ${error}`.slice(0, 500) },
    });
    return;
  }
  /**
   * ── DENEME SAYILMAYAN DÜŞÜŞ = SONSUZ DÖNGÜ ─────────────────────────────
   *
   * CANLI ARIZA (1 Kasım 2026): rehber akışı kanıt kapısında düşen kelime için
   * `markKeywordInProgress` ÇAĞIRMIYOR (o çağrı yazardan hemen önce, satır
   * ~186'da). Sonuç: kelime QUEUED'a dönüyor ama `attempts` 0 ve
   * `lastTriedAt` boş kalıyordu. Yani "3 denemeden sonra düşer" kuralı kanıt
   * kapısında HİÇ işlemiyor; 47 varlık kelimesi her koşuda yeniden seçilip
   * günlük rehber kotasını sonsuza kadar yiyordu.
   *
   * Kural: kelime yazıma alınmadıysa (IN_PROGRESS değilse) bu düşüş onun
   * denemesi sayılır. `markKeywordInProgress` zaten saymışsa ikinci kez
   * artırılmaz.
   */
  const next = resolveKeywordFailure(current);
  await prisma.keyword.update({
    where: { id },
    data: {
      status: next.status,
      lastError: error.slice(0, 500),
      lastTriedAt: new Date(),
      ...(next.counted ? { attempts: { increment: 1 } } : {}),
    },
  });
}

export interface KeywordFailureState {
  status: "QUEUED" | "FAILED";
  /** Bu düşüş `attempts` sayacına yazılmalı mı? */
  counted: boolean;
}

/**
 * Başarısız bir kelimenin sonraki durumunu hesaplar (DB'siz, saf).
 *
 * `markKeywordInProgress` denemeyi zaten saymışsa (durum IN_PROGRESS) tekrar
 * sayılmaz; kanıt kapısı gibi yazar ÖNCESİ düşüşlerde ise bu düşüş denemedir.
 */
export function resolveKeywordFailure(
  current: { attempts: number; status: string } | null,
  maxAttempts = MAX_KEYWORD_ATTEMPTS,
): KeywordFailureState {
  const alreadyCounted = current?.status === "IN_PROGRESS";
  const attempts = (current?.attempts ?? 0) + (alreadyCounted ? 0 : 1);
  return {
    status: attempts >= maxAttempts ? "FAILED" : "QUEUED",
    counted: !alreadyCounted,
  };
}

export interface KeywordPoolStats {
  queued: number;
  inProgress: number;
  published: number;
  failed: number;
  paused: number;
  clusters: number;
}

export async function getKeywordPoolStats(): Promise<KeywordPoolStats> {
  const [grouped, clusters] = await Promise.all([
    prisma.keyword.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.keyword.findMany({ distinct: ["cluster"], select: { cluster: true } }),
  ]);
  const count = (status: string) =>
    grouped.find((row) => row.status === status)?._count._all ?? 0;
  return {
    queued: count("QUEUED"),
    inProgress: count("IN_PROGRESS"),
    published: count("PUBLISHED"),
    failed: count("FAILED"),
    paused: count("PAUSED"),
    clusters: clusters.length,
  };
}
