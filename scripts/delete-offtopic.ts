// Finans/ekonomi ile alakasız (metro kazası vb.) mevcut makaleleri bulur ve
// ARŞİVLER. Çalıştırma: npx tsx --env-file=.env scripts/delete-offtopic.ts [--apply]
//
// ⚠️ ARTIK SİLMİYOR — ve bunun somut bir bedeli oldu.
// Bu script "Midas ödeme sistemleri işine giriyor, kurucu Egem Eraslan
// açıkladı" haberini alakasız sayıp KALICI olarak sildi. Oysa 2026-08-31
// Search Console verisine göre o sayfa sitenin Google'da iş yapan TEK
// sayfasıydı: "midas kurucu" 12., "midasın sahibi kim" 20., "egem eraslan
// kimdir" 26. sıra — altı ayrı sorguda görünürlük. Ne yedeği vardı ne de
// Wayback kaydı; içerik geri getirilemedi, URL 404'e düştü.
//
// Sebep, aşağıdaki alaka listesinin makro sözlükten (dolar, faiz, enflasyon)
// oluşması: şirket ve kişi haberleri bu kelimelerin hiçbirini içermiyor.
// Yani filtre tam olarak sitenin KAZANDIĞI içerik tipini eliyordu.
//
// İki koruma eklendi: (1) silme yerine arşivleme — karar geri alınabilir,
// (2) Search Console'da gösterim almış sayfaya hiç dokunulmaz; Google'ın
// değer verdiği bir sayfayı yerel bir kelime listesine bakarak atmak yanlış.
import { prisma } from "../lib/db";
import { CATEGORIES } from "../lib/bot/config";

// topics.ts'teki ile aynı alaka listesi.
const ECONOMY_RELEVANCE = [
  "ekonomi","ekonomik","finans","piyasa","borsa","hisse","endeks","yatırım","yatırımcı",
  "dolar","euro","sterlin","kur","döviz","altın","gram","ons","faiz","enflasyon","merkez bankası",
  "tcmb","fed","büyüme","resesyon","durgunluk","ihracat","ithalat","ticaret","gümrük","tarife",
  "bütçe","vergi","teşvik","istihdam","işsizlik","asgari ücret","maaş","zam","sanayi","üretim",
  "kapasite","gsyih","gsyh","üfe","tüfe","gfe","cari açık","rezerv","kredi","borç","tahvil",
  "banka","bankacılık","şirket","bilanço","temettü","halka arz","imf","dünya bankası","petrol",
  "doğalgaz","enerji","emtia","konut","kira","fiyat","güven endeksi","tüketici",
];

function isRelevant(title: string, content: string): boolean {
  const text = (title + " " + content).toLowerCase();
  for (const kws of Object.values(CATEGORIES)) if (kws.some((k) => text.includes(k))) return true;
  return ECONOMY_RELEVANCE.some((k) => text.includes(k));
}

async function main() {
  const apply = process.argv.includes("--apply");
  const arts = await prisma.article.findMany({
    where: { status: { not: "ARCHIVED" } },
    select: { id: true, title: true, content: true, slug: true },
  });
  const aday = arts.filter((a) => !isRelevant(a.title, a.content.slice(0, 600)));

  // Search Console'da gösterim almış her sayfa dokunulmazdır.
  const gorunur = new Set(
    (await prisma.searchPerformance.findMany({
      where: { impressions: { gt: 0 } },
      select: { page: true },
    })).map((row) => row.page),
  );
  const korunan = aday.filter((a) => [...gorunur].some((page) => page.includes(a.slug)));
  const offtopic = aday.filter((a) => !korunan.includes(a));

  for (const a of korunan) {
    console.log(`[offtopic] KORUNDU (Search Console'da gösterim alıyor): ${a.title}`);
  }
  if (!offtopic.length) { console.log("[offtopic] Arşivlenecek makale yok."); await prisma.$disconnect(); return; }
  console.log(`[offtopic] ${offtopic.length} alakasız makale:`);
  for (const a of offtopic) console.log(`  - ${a.title}`);
  if (apply) {
    await prisma.article.updateMany({
      where: { id: { in: offtopic.map((a) => a.id) } },
      data: { status: "ARCHIVED" },
    });
    console.log(`[offtopic] ${offtopic.length} makale ARŞİVLENDİ (silinmedi — geri alınabilir).`);
  } else {
    console.log("[offtopic] (kuru çalışma — arşivlemek için --apply)");
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
