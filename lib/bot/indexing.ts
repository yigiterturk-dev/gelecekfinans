/**
 * GelecekFinans'ın normal makale ve rehberleri Google Indexing API için uygun
 * içerik türünde değil. Google bu API'yi yalnız JobPosting ve
 * VideoObject içindeki BroadcastEvent sayfaları için destekliyor.
 *
 * Bu yardımcıyı mevcut article akışlarında güvenlik freni olarak tutuyoruz:
 * yanlış içerik türünde URL, kimlik bilgileri olsa bile Google'a gönderilmez.
 */

export type IndexingPingResult =
  | { ok: true }
  | { ok: false; reason: "unsupported-content" };

/** Normal article URL'si için API çağrısı yapmadan uygun olmadığını bildirir. */
export async function notifyGoogleUrlUpdated(_url: string): Promise<IndexingPingResult> {
  return { ok: false, reason: "unsupported-content" };
}
