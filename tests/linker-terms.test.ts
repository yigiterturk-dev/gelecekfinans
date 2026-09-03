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
