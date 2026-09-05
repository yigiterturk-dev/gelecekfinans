import test from "node:test";
import assert from "node:assert/strict";
import { injectInternalLinks, linkableTerms } from "../lib/bot/linker";

/**
 * CANLI ARIZA (4 Eylül 2026): iç bağlantı üreticisi başlıktaki JENERİK
 * kelimeleri çapa metni yapıyordu. Yayındaki "Enflasyon nedir nasıl
 * hesaplanır" makalesinin giriş cümlesinde "nasıl" kelimesi iki ayrı,
 * konuyla ilgisiz makaleye bağlanmıştı:
 *   "Enflasyon nedir <a href=/birikim-nasil-degerlendirilir>nasıl</a> hesaplanır"
 * Sebep: `title.split(...).filter(w => w.length > 4)` — "nasıl" 5 harf.
 * Alakasız çapa metni hem okuru yanıltır hem de bağlantının SEO değerini
 * sıfırlar; anlamlı çapa, hedef sayfanın KONUSUNU söylemelidir.
 */
test("jenerik soru kelimeleri çapa metni olarak seçilmez", () => {
  const terms = linkableTerms({
    title: "Birikim nasıl değerlendirilir? Kapsamlı ve kalıcı bir yol haritası",
    keyword: "birikim nasıl değerlendirilir",
  });
  for (const generic of ["nasıl", "nedir", "neden", "hangi", "kalıcı", "kapsamlı"]) {
    assert.ok(
      !terms.includes(generic),
      `jenerik kelime çapa olarak seçildi: ${generic} (${terms.join(", ")})`,
    );
  }
});

test("anlamlı çapa metni hedefin konusunu söyler", () => {
  const terms = linkableTerms({
    title: "Borsaya nasıl başlanır: İlk adımlar, hesap açılışı ve temel kurallar",
    keyword: "borsaya nasıl başlanır",
  });
  assert.ok(terms.length > 0, "hiç çapa üretilmedi");
  // İlk sıradaki çapa tam anahtar kelime öbeği olmalı, tek kelime değil.
  assert.equal(terms[0], "borsaya nasıl başlanır");
  assert.ok(terms.every((t) => t.includes(" ") || t.length >= 7), terms.join(", "));
});

test("anahtar kelimesi olmayan makalede başlık öbeği kullanılır", () => {
  const terms = linkableTerms({
    title: "Merkez Bankası rezervleri 188,2 milyar dolar oldu",
    keyword: null,
  });
  assert.ok(terms.length > 0);
  assert.ok(
    terms.some((t) => t.toLocaleLowerCase("tr-TR").includes("rezerv")),
    terms.join(", "),
  );
  assert.ok(!terms.includes("oldu"));
});

/**
 * CANLI ARIZA (4 Eylül 2026): otomatik iç bağlantı, makalenin GİRİŞ
 * cümlesindeki odak anahtar kelimenin ortasına giriyordu:
 *   "<a href="/agustos-enflasyonu...">Enflasyon</a> nedir nasıl hesaplanır"
 * Öbek ikiye bölününce SEO çözümlemesi "anahtar kelime bulunamadı" diyor ve
 * makale kendi hedef sorgusunda zayıflıyordu (skor 79'da takılıydı).
 *
 * Kural: giriş paragrafı (lede) odak kelimeyi TEMİZ taşımalı; otomatik iç
 * bağlantılar gövdeye yerleşir. Lede zaten okurun ve arama motorunun konuyu
 * belirlediği yerdir, oraya alakasız bir hedefe çıkan çapa koymak iki işi de
 * bozar.
 */
test("otomatik iç bağlantı giriş paragrafına dokunmaz", () => {
  const lede = "<p>Enflasyon nedir nasıl hesaplanır sorusu fiyat düzeyini anlamayı gerektirir.</p>";
  const body = "<p>Bu konunun devamında borsaya nasıl başlanır sorusu ayrı bir rehberde ele alınır.</p>";
  const output = injectInternalLinks(lede + body, [
    { slug: "borsaya-nasil-baslanir", title: "Borsaya nasıl başlanır: İlk adımlar", category: "borsa", keyword: "borsaya nasıl başlanır" },
    { slug: "enflasyon-verisi", title: "Enflasyon verisi nasıl okunur", category: "ekonomi", keyword: "enflasyon nedir nasıl hesaplanır" },
  ], "mevcut-makale", 3);

  const outputLede = output.slice(0, output.indexOf("</p>") + 4);
  assert.doesNotMatch(outputLede, /<a\s/, `giriş paragrafına bağlantı girdi: ${outputLede}`);
  assert.match(output, /<a href="\/borsaya-nasil-baslanir"/, "gövdeye bağlantı hiç girmedi");
});

/**
 * CANLI ARIZA (5 Eylül 2026): "Konut satışında DASK devri bitiyor" taslağında
 * iki iç bağlantının çapası da FİİL/BAĞLAÇ çıkmıştı:
 *   "…<a href="/japon-remixpoint-tum-altcoinleri-satti…">yalnızca</a>…"
 *   "…<a href="/tim-baskani-gultepe-e-ihracat-hizla-buyumeye-devam-edecek">devam edecek</a>…"
 * İkisi de DASK ile ilgisiz makalelere çıkıyordu. 4 Eylül'deki jenerik-kelime
 * listesi bunları yakalamıyor: "yalnızca" 8 harf (tek kelime eşiğini geçiyor),
 * "devam" 5 harf ve listede değil.
 *
 * Kök neden liste eksikliği DEĞİL, kuralın yanlış yerde durması: çapa metni
 * hedefin KONUSUNU söylemek zorunda. Kapalı sınıf kelimeler (bağlaç/zarf) ve
 * çekimli fiiller hiçbir sayfanın konusu olamaz — bu yüzden yapısal olarak
 * elenirler. Bunun ikinci faydası konu alakası: makale hedefin konu
 * kelimesini gerçekten geçmiyorsa bağlantı hiç kurulmaz.
 */
test("bağlaç/zarf ve çekimli fiil çapa metni olamaz", () => {
  const terms = linkableTerms({
    title: "Japon Remixpoint tüm altcoinleri sattı portföyde yalnızca Bitcoin kaldı",
    keyword: null,
  });
  for (const bad of ["yalnızca", "tüm", "sattı", "kaldı"]) {
    assert.ok(!terms.includes(bad), `kötü çapa üretildi: ${bad} (${terms.join(", ")})`);
  }
  assert.ok(
    terms.some((t) => t.toLocaleLowerCase("tr-TR").includes("altcoin") || t.includes("Remixpoint")),
    terms.join(", "),
  );
});

test("yardımcı fiil öbeği çapa metni olamaz", () => {
  const terms = linkableTerms({
    title: "TİM Başkanı Gültepe: e-ihracat hızla büyümeye devam edecek",
    keyword: null,
  });
  for (const bad of ["devam edecek", "büyümeye devam edecek", "hızla büyümeye", "edecek", "büyümeye"]) {
    assert.ok(!terms.includes(bad), `kötü çapa üretildi: ${bad} (${terms.join(", ")})`);
  }
});

test("konusu geçmeyen makaleye iç bağlantı kurulmaz", () => {
  const html =
    "<p>Zorunlu deprem sigortası poliçesinin devri konut satışında sona eriyor.</p>" +
    "<p>Yeni hak sahibi, poliçeyi kendi adına yeniden düzenletmek zorunda kalacak ve bu süreç devam edecek.</p>";
  const output = injectInternalLinks(html, [
    { slug: "japon-remixpoint-tum-altcoinleri-satti", title: "Japon Remixpoint tüm altcoinleri sattı portföyde yalnızca Bitcoin kaldı", category: "kripto", keyword: null },
    { slug: "tim-baskani-gultepe-e-ihracat", title: "TİM Başkanı Gültepe: e-ihracat hızla büyümeye devam edecek", category: "ekonomi", keyword: null },
  ], "konut-satisinda-dask-devri", 3);

  assert.equal(output, html, `alakasız bağlantı girdi: ${output}`);
});

/**
 * [DAHILI_LINK] yer tutucusu 5 Eylül 2026'ya kadar SIRAYLA dolduruluyordu
 * (`pool[idx % pool.length]`) — konu bakılmıyordu. Aynı kategoride olmak
 * "ilgili" sayılıyor, o da yoksa havuzdaki ilk makale gövdeye giriyordu.
 * Alakasız hedef yerine kalıcı kategori/veri merkezine bağlanmak doğrusu.
 */
test("alakasız aday varken yer tutucu kategori merkezine bağlanır", async () => {
  const { pickPlaceholderTarget } = await import("../lib/bot/linker");
  const html = "<p>Zorunlu deprem sigortası poliçesi konut satışında devredilemeyecek.</p>";
  const pool = [
    { slug: "japon-remixpoint", title: "Japon Remixpoint tüm altcoinleri sattı", category: "kripto", keyword: null },
  ];
  assert.equal(pickPlaceholderTarget(html, pool, new Set()), null);
});

/**
 * Render tarafındaki İKİNCİ üretici de aynı kapıdan geçmeli. 5 Eylül 2026'da
 * bot tarafı düzeltildi ama `lib/internal-links.ts` gözden kaçmıştı: canlı
 * makale sayfası kendi süzgeçsiz bağlantısını (`k.length > 3`) ekliyordu, yani
 * kayıtlı içerik temizlense bile okunan sayfa bozuk kalıyordu.
 */
test("render tarafı üretici de içerik kelimesi olmayan çapayı kurmaz", async () => {
  const { injectInternalLinks: renderInject } = await import("../lib/internal-links");
  const html =
    "<p>Zorunlu deprem sigortası poliçesi konut satışında devredilemeyecek.</p>" +
    "<p>Yeni hak sahibi bildirim yaptıktan sonra deprem sigortası süreci devam edecek.</p>";
  const out = renderInject(html, "dask", [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { slug: "ihracat", title: "e-ihracat", keyword: "devam edecek" } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { slug: "deprem-sigortasi", title: "Deprem sigortası", keyword: "deprem sigortası" } as any,
  ]);
  assert.doesNotMatch(out, /href="\/ihracat"/, `fiil çapası kuruldu: ${out}`);
  assert.match(out, /href="\/deprem-sigortasi"/, "konuyla ilgili bağlantı hiç kurulmadı");
});

/**
 * `\b` ASCII sınırıdır: "deprem sigortası" çapası `\b...\b` ile HİÇ eşleşmez,
 * çünkü sondaki "ı" kelime karakteri sayılmaz. Sonuç sessiz bir sapmaydı —
 * üretici Türkçe ekle biten (anlamlı) çapaları atlayıp ASCII ile biten jenerik
 * kelimelere düşüyordu. Çapa kalitesizliğinin nedenlerinden biri bu sınırdı.
 */
test("Türkçe ekle biten çapa da eşleşir", async () => {
  const { injectInternalLinks: renderInject } = await import("../lib/internal-links");
  const html =
    "<p>Giriş paragrafı burada durur ve konuyu tanıtır.</p>" +
    "<p>Yeni hak sahibi için deprem sigortası yükümlülüğü sürüyor.</p>";
  const out = renderInject(html, "dask", [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { slug: "deprem-sigortasi", title: "Deprem sigortası", keyword: "deprem sigortası" } as any,
  ]);
  assert.match(out, /<a href="\/deprem-sigortasi"[^>]*>deprem sigortası<\/a>/, out);
});

test("çapa bir kelimenin ORTASINDA eşleşmez", async () => {
  const { injectInternalLinks: renderInject } = await import("../lib/internal-links");
  const html =
    "<p>Giriş paragrafı burada durur.</p>" +
    "<p>Altınlar ve altıncı madde ayrı konulardır.</p>";
  const out = renderInject(html, "x", [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { slug: "altin", title: "Altın", keyword: "altın" } as any,
  ]);
  assert.doesNotMatch(out, /<a href="\/altin"/, `kelime ortasına link girdi: ${out}`);
});

/**
 * ÜÇÜNCÜ TUR (5 Eylül 2026): yapısal süzgeç "yalnızca"yı eledi ama SIFAT
 * geçiyordu — yazı yeniden üretildiğinde DASK haberi "sınırlı" çapasıyla bir
 * TCMB enflasyon haberine bağlandı ("…ağustosta sınırlı yükseldi" başlığından).
 * Ders: tek kelimelik çapa yalnızca hedefin ANAHTAR KELİMESİNDEN gelebilir;
 * başlıktan koparılan sıfat/zarf/ay adı hedefin konusunu söylemez.
 */
test("başlıktan koparılan sıfat tek kelimelik çapa olamaz", () => {
  const terms = linkableTerms({
    title: "TCMB enflasyonun ana eğilimi ağustosta sınırlı yükseldi",
    keyword: null,
  });
  for (const bad of ["sınırlı", "ağustosta", "ağustosta sınırlı", "yükseldi"]) {
    assert.ok(!terms.includes(bad), `kötü çapa üretildi: ${bad} (${terms.join(", ")})`);
  }
  assert.ok(
    terms.some((t) => t.toLocaleLowerCase("tr-TR").includes("enflasyon")),
    terms.join(", "),
  );
});

test("anahtar kelimede geçen tek kelime çapa olabilir", () => {
  const terms = linkableTerms({
    title: "Zorunlu deprem sigortası poliçesi devri değişiyor",
    keyword: "zorunlu deprem sigortası",
  });
  assert.equal(terms[0], "zorunlu deprem sigortası");
  assert.ok(terms.includes("sigortası"), terms.join(", "));
});
