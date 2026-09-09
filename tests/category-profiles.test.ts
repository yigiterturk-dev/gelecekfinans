import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { CATEGORY_PROFILES, getCategoryProfile } from "../lib/category-profiles";
import { CATS } from "../components/ArticleCard";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("her kategorinin kendi profili var", () => {
  // Sebep: 9 Eylül'de /kategori/doviz 178 kelimeyle "Discovered - not indexed"
  // çıktı. Kategori sayfaları tek şablondan üretiliyor; özgün metin olmadan
  // beşi de birbirinin kopyası oluyor.
  for (const cat of Object.keys(CATS)) {
    assert.ok(getCategoryProfile(cat), `${cat} kategorisinin profili yok`);
  }
});

test("profil metinleri değişken rakam içermiyor", () => {
  // stock-profiles/market-faq ile aynı kural: fiyat, oran, yüzde bayatlar.
  const yasak = /\d[\d.,]*\s*(%|TL|dolar|lira|milyar|milyon|puan)|%\s*\d/i;
  for (const [cat, p] of Object.entries(CATEGORY_PROFILES)) {
    for (const t of [...p.paragraphs, ...p.faq.flatMap((f) => [f.q, f.a])]) {
      assert.ok(!yasak.test(t), `${cat}: metinde değişken rakam var -> ${t.slice(0, 60)}`);
    }
  }
});

test("her profil en az iki paragraf ve üç soru taşıyor", () => {
  for (const [cat, p] of Object.entries(CATEGORY_PROFILES)) {
    assert.ok(p.paragraphs.length >= 2, `${cat}: paragraf az`);
    assert.ok(p.faq.length >= 3, `${cat}: soru az`);
    for (const t of p.paragraphs) assert.ok(t.length > 300, `${cat}: paragraf çok kısa`);
  }
});

test("kategori sayfası profili gerçekten basıyor", () => {
  // Metni yazıp sayfaya bağlamayı unutmak bu depoda tekrarlayan hata sınıfı.
  const page = read("app/kategori/[cat]/page.tsx");
  assert.ok(page.includes("getCategoryProfile"), "sayfa profili okumalı");
  assert.ok(page.includes("MarketFaq"), "sayfa SSS bileşenini basmalı");
  assert.ok(page.includes("page === 1"), "profil yalnızca ilk sayfada basılmalı");
});

test("sorular kategoriler arasında tekrarlamıyor", () => {
  const sorular = Object.values(CATEGORY_PROFILES).flatMap((p) => p.faq.map((f) => f.q));
  assert.equal(new Set(sorular).size, sorular.length, "aynı soru iki kategoride");
});
