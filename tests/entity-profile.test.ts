import test from "node:test";
import assert from "node:assert/strict";
import { parseProfileSubject, profileAboutLd } from "../lib/entity-profile";
import { ledeOpensWithDefinition } from "../lib/bot/quality";

test("kişi künyesi Person olarak tanınır", () => {
  const s = parseProfileSubject("Egem Eraslan kimdir? Midas’ın kurucusu ve CEO’su hakkında bilinenler");
  assert.deepEqual(s, { name: "Egem Eraslan", kind: "Person" });
});

test("kurumsal ad kimdir kalıbında bile Organization sayılır", () => {
  assert.deepEqual(parseProfileSubject("Koç Holding kimdir?"), { name: "Koç Holding", kind: "Organization" });
});

test("kurumsal işaretli nedir kalıbı künye sayılır", () => {
  assert.deepEqual(parseProfileSubject("Borsa İstanbul nedir, sahibi kim?"), {
    name: "Borsa İstanbul",
    kind: "Organization",
  });
});

test("kavram rehberi künye sayılmaz", () => {
  assert.equal(parseProfileSubject("Enflasyon nedir, nasıl hesaplanır? Kavram, yöntem"), null);
  assert.equal(parseProfileSubject("Altın yatırımı nasıl yapılır?"), null);
  assert.equal(parseProfileSubject("Borsa İstanbul’da gün düşüşle kapandı"), null);
});

test("about düğümü tip, ad ve sayfa bağını taşır", () => {
  const ld = profileAboutLd({ name: "Egem Eraslan", kind: "Person" }, { url: "https://x.com/a", description: "d" });
  assert.equal(ld["@type"], "Person");
  assert.equal(ld.name, "Egem Eraslan");
  assert.deepEqual(ld.mainEntityOfPage, { "@id": "https://x.com/a" });
});

// Künye ledesi: "X kimdir" sorgusunda cevap ilk cümlede olmalı.
test("tanım cümlesi kabul edilir, iyelikli açılış reddedilir", () => {
  assert.equal(
    ledeOpensWithDefinition("Egem Eraslan, Midas’ın kurucusu ve CEO’sudur.", "Egem Eraslan"),
    true,
  );
  assert.equal(
    ledeOpensWithDefinition("Egem Eraslan’ın liderliği, Midas’ın evrilme sürecini hızlandırmakta.", "Egem Eraslan"),
    false,
  );
  assert.equal(
    ledeOpensWithDefinition("Midas’ın kurucusu Egem Eraslan, yeni ürünleri duyurdu.", "Egem Eraslan"),
    false,
  );
});
