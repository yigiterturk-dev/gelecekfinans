import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { BRAND, BRAND_ALIASES, HOME_TITLE, TITLE_TEMPLATE } from "../lib/brand";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("anasayfa başlığı marka adını taşır", () => {
  // Bu testin tek varlık sebebi: başlık marka olmadan yayına çıktı ve site
  // kendi adıyla aramada haftalarca hiç görünmedi.
  assert.ok(HOME_TITLE.startsWith(BRAND), "marka başlıkta ÖNDE olmalı");
  // Sabiti gerçekten KULLANMALI: metni ikinci kez yazmak iki yerin ayrışması demek.
  assert.ok(read("app/page.tsx").includes("HOME_TITLE"), "app/page.tsx HOME_TITLE sabitini kullanmalı");
});

test("anasayfa başlığı şablona bırakılmaz", () => {
  // `title.template` aynı route segmentindeki page.tsx'e UYGULANMAZ (Next
  // belgesi). Anasayfa markayı kendi başlığında taşımak zorunda.
  const page = read("app/page.tsx");
  assert.ok(page.includes("absolute"), "anasayfa başlığı `absolute` ile verilmeli");
  assert.ok(TITLE_TEMPLATE.includes(BRAND), "alt sayfa şablonu markayı taşımalı");
});

test("anasayfa H1'i marka adını taşır", () => {
  const page = read("app/page.tsx");
  assert.ok(/<h1[\s\S]{0,600}\{HOME_TITLE\}[\s\S]{0,40}<\/h1>/.test(page), "H1 marka taşıyan başlığı basmalı");
});

test("şema markanın diğer yazımlarını aynı varlığa bağlar", () => {
  const layout = read("app/layout.tsx");
  assert.ok(layout.includes("alternateName"), "alternateName olmadan yazımlar ayrı varlık sayılır");
  assert.ok(layout.includes("BRAND_ALIASES"), "şema takma adları tek kaynaktan almalı");
  assert.ok(BRAND_ALIASES.includes("Gelecek Finans"), "görünür logodaki boşluklu yazım bağlanmalı");
  assert.ok(BRAND_ALIASES.includes("gelecekfinans"), "alan adı yazımı bağlanmalı");
});
