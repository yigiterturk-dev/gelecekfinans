/**
 * "X kimdir" künye sayfalarının varlık şeması.
 *
 * Neden: GSC'de sitenin TEK gerçek sıralaması bu şeritten geldi — "midas
 * kurucu" 12., "midasın sahibi kim" 20., "egem eraslan kimdir" 26. sıra.
 * Sayfa NewsArticle olarak işaretliydi; sayfanın HAKKINDA olduğu varlık
 * makinece okunabilir değildi. `about` düğümü tam bunun için var: Google'ın
 * sayfayı bir kişiye/kuruma bağlamasını sağlar.
 *
 * ProfilePage bilerek KULLANILMADI: Google onu "yazarın kendi profil sayfası"
 * (sosyal profil, ilk ağızdan içerik) için tanımlıyor; üçüncü kişi hakkında
 * yazılmış künyeye takmak yanlış işaretlemedir.
 */

export interface ProfileSubject {
  name: string;
  kind: "Person" | "Organization";
}

/** Kurumsal olduğunu kesinleştiren ekler — bunlar varsa özne kişi değildir. */
const ORGANIZATION_MARKERS = [
  "a.ş", "aş", "anonim şirketi", "şirketi", "ltd", "limited", "holding",
  "bankası", "banka", "grubu", "grup", "kurumu", "kurulu", "bakanlığı",
  "borsa", "menkul", "sigorta", "fonu", "birliği", "odası", "derneği",
  "üniversitesi", "ajansı", "platformu",
];

function looksCorporate(name: string): boolean {
  const lower = ` ${name.toLocaleLowerCase("tr-TR")} `;
  return ORGANIZATION_MARKERS.some((marker) => lower.includes(` ${marker} `) || lower.includes(` ${marker}.`));
}

/**
 * Başlıktan künye öznesini çıkarır. Eşleşmezse null döner — yani şemaya
 * hiçbir şey eklenmez (uydurma varlık düğümü basmaktansa hiç basmamak yeğdir).
 *
 *   "Egem Eraslan kimdir? Midas'ın kurucusu…"  → { Egem Eraslan, Person }
 *   "Koç Holding nedir, sahibi kim?"           → { Koç Holding, Organization }
 *   "Enflasyon nedir, nasıl hesaplanır?"       → null (kurumsal işaret yok)
 */
export function parseProfileSubject(title: string): ProfileSubject | null {
  const clean = title.trim();

  const kimdir = clean.match(/^(.{2,60}?)\s+kimdir\b/i);
  if (kimdir) {
    const name = kimdir[1].trim().replace(/[?:,–—-]+$/, "").trim();
    if (!name) return null;
    return { name, kind: looksCorporate(name) ? "Organization" : "Person" };
  }

  // "nedir" kalıbı yalnızca kurumsal işaret taşıyorsa künyedir; aksi hâlde
  // "Enflasyon nedir" gibi kavram rehberidir ve varlık düğümü almamalıdır.
  const nedir = clean.match(/^(.{2,60}?)\s+(?:nedir|sahibi kim)\b/i);
  if (nedir) {
    const name = nedir[1].trim().replace(/[?:,–—-]+$/, "").trim();
    if (name && looksCorporate(name)) return { name, kind: "Organization" };
  }

  return null;
}

/** Sayfanın konusu olan varlığın JSON-LD düğümü. */
export function profileAboutLd(
  subject: ProfileSubject,
  opts: { url: string; description?: string | null },
): Record<string, unknown> {
  return {
    "@type": subject.kind,
    "@id": `${opts.url}#about`,
    name: subject.name,
    ...(opts.description ? { description: opts.description } : {}),
    mainEntityOfPage: { "@id": opts.url },
  };
}
