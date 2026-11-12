/**
 * TCMB faiz oranları — anahtarsız, resmî sayfadan okur.
 *
 * 2026-11-12'de ölçüldü: tcmb.gov.tr faiz tabloları artık sunucu tarafında
 * HTML olarak geliyor (eski "JS ile render" notu geçersiz). Her tablonun son
 * satırı yürürlükteki orandır.
 *   1 Hafta Repo → "Tarih | Borç Alma | Borç Verme"  (politika faizi = Borç Verme)
 *   faiz-oranlari → gecelik (O/N) "Tarih | Borç Alma | Borç Verme"
 *
 * Doğrulanamazsa (biçim değişti, ağ yok, saçma değer) null döner; sayfa sabit
 * tabloya düşer ve bayat olduğunu açıkça söyler.
 */

const BASE =
  "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Temel+Faaliyetler/Para+Politikasi/Merkez+Bankasi+Faiz+Oranlari";

export interface TcmbRates {
  /** 1 hafta repo = politika faizi */
  policy: number;
  /** gecelik borçlanma (alt bant) */
  borrow: number;
  /** gecelik borç verme (üst bant) */
  lend: number;
  /** yürürlük tarihi, GG.AA.YYYY */
  date: string;
}

async function html(path: string): Promise<string | null> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 8000);
  try {
    const res = await fetch(`${BASE}/${path}`, {
      next: { revalidate: 3600 },
      signal: c.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GelecekFinans/1.0)" },
    });
    if (!res.ok) return null;
    return (await res.text())
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ");
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Metindeki "GG.AA.YY[YY] a b" satırlarının sonuncusu. a "-" olabilir. */
function sonSatir(text: string): { date: string; a: number | null; b: number } | null {
  const re = /(\d{2}\.\d{2}\.\d{2,4})\s+(-|\d{1,3}\.\d{2})\s+(\d{1,3}\.\d{2})/g;
  let m: RegExpExecArray | null;
  let son: RegExpExecArray | null = null;
  while ((m = re.exec(text))) son = m;
  if (!son) return null;
  return { date: son[1], a: son[2] === "-" ? null : Number(son[2]), b: Number(son[3]) };
}

const makul = (n: number | null | undefined) =>
  typeof n === "number" && Number.isFinite(n) && n > 0 && n < 150;

export async function fetchTcmbRates(): Promise<TcmbRates | null> {
  const [repoHtml, onHtml] = await Promise.all([html("1+Hafta+Repo"), html("faiz-oranlari")]);
  if (!repoHtml || !onHtml) return null;
  const repo = sonSatir(repoHtml);
  const on = sonSatir(onHtml.slice(onHtml.indexOf("Tarih Borç Alma Borç Verme")));
  if (!repo || !on || !makul(repo.b) || !makul(on.a) || !makul(on.b)) return null;
  if (on.a! >= on.b) return null; // alt bant < üst bant olmalı
  return { policy: repo.b, borrow: on.a!, lend: on.b, date: repo.date };
}
