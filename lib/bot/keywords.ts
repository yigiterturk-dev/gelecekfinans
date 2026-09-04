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
  const cooldown = new Date(Date.now() - KEYWORD_COOLDOWN_HOURS * 60 * 60 * 1000);
  const candidates = await prisma.keyword.findMany({
    where: {
      status: "QUEUED",
      attempts: { lt: MAX_KEYWORD_ATTEMPTS },
      ...(category ? { category } : {}),
      OR: [{ lastTriedAt: null }, { lastTriedAt: { lt: cooldown } }],
    },
    orderBy: [
      { isHub: "desc" },
      { priority: "desc" },
      { attempts: "asc" },
      { createdAt: "asc" },
    ],
    take: Math.max(limit * 6, 12),
    select: {
      id: true, term: true, category: true, cluster: true,
      isHub: true, intent: true, priority: true, origin: true,
    },
  });

  const picked: KeywordPick[] = [];
  const usedClusters = new Set<string>();
  for (const candidate of candidates) {
    if (picked.length >= limit) break;
    if (usedClusters.has(candidate.cluster)) continue;
    usedClusters.add(candidate.cluster);
    picked.push(candidate);
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
  const exhausted = (current?.attempts ?? 0) >= MAX_KEYWORD_ATTEMPTS;
  await prisma.keyword.update({
    where: { id },
    data: { status: exhausted ? "FAILED" : "QUEUED", lastError: error.slice(0, 500) },
  });
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
