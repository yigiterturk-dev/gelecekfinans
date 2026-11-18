import sitemap from "../sitemap";

/*
  llms.txt — AI arama motorları (ChatGPT, Perplexity, Claude, AI Overviews) için
  sitenin ne olduğunu ve sayfaların nerede durduğunu düz metin olarak anlatır.
  Sayfa listesi sitemap'ten üretilir; elle güncellenecek ikinci liste yok.
*/
export const revalidate = 3600;

const BASLIK = "Gelecek Finans";
const OZET = "Borsa, döviz, kripto para, altın ve ekonomi alanında güncel haberler, rehberler ve hesaplama araçları yayımlayan Türkçe finans yayını.";
const DETAY = "- Haberler, rehber yazıları, piyasa sayfaları (döviz, altın, kripto, borsa, faiz) ve hesaplama araçları (/araclar) yayımlanır.\n- Yayın kuralları /yayincilik-ilkeleri sayfasındadır.\n- İçerik yatırım tavsiyesi değildir.";
const BOLUMLER: Record<string, string> = {"": "Yazılar ve sayfalar", "araclar": "Araçlar", "kategori": "Kategoriler", "rehber": "Rehberler", "kripto": "Kripto", "doviz": "Döviz", "altin": "Altın", "borsa": "Borsa", "faiz": "Faiz", "yazarlar": "Yazarlar"};
const ANA = "Ana sayfa";

function etiket(url: string): string {
  const yol = new URL(url).pathname.replace(/\/$/, "");
  if (!yol) return ANA;
  const son = decodeURIComponent(yol.split("/").pop() || "");
  const metin = son.replace(/-/g, " ");
  return metin.charAt(0).toLocaleUpperCase("tr") + metin.slice(1);
}

export async function GET() {
  const girdiler = await sitemap();
  const gruplar = new Map<string, string[]>();
  for (const g of girdiler) {
    const ilk = new URL(g.url).pathname.split("/").filter(Boolean);
    const anahtar = ilk.length > 1 && BOLUMLER[ilk[0]] ? ilk[0] : ilk.length === 1 && BOLUMLER[ilk[0]] ? ilk[0] : "";
    const ad = BOLUMLER[anahtar] ?? BOLUMLER[""];
    if (!gruplar.has(ad)) gruplar.set(ad, []);
    gruplar.get(ad)!.push(`- [${etiket(g.url)}](${g.url})`);
  }
  const bolumler = [...gruplar.entries()].map(([ad, satirlar]) => `## ${ad}\n\n${satirlar.join("\n")}`);
  const govde = `# ${BASLIK}\n\n> ${OZET}\n\n${DETAY}\n\n${bolumler.join("\n\n")}\n`;
  return new Response(govde, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
