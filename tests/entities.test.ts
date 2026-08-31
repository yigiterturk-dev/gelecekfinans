import assert from "node:assert/strict";
import test from "node:test";
import {
  acronymOf,
  entityKeywordTerm,
  isGroundedInEvidence,
  isRecordableEntity,
  isStorySubject,
  looksLikeEnumeration,
  looksLikeTicker,
  normalizeEntityKey,
} from "../lib/bot/entities";
import type { ExtractedEntity } from "../lib/bot/writer";

/**
 * Bu dosyanın tek işi şunu ispatlamak: model uydurduğunda varlık havuza
 * GİREMEZ. Gerçek kişi/şirket hakkında kanıtsız cümle YMYL ihlalidir ve
 * AdSense'i kalıcı olarak kaybettirir; kapı burada tutmazsa başka yerde
 * tutmuyor.
 */

const EVIDENCE = [
  "Midas ödeme sistemleri işine giriyor.",
  "Şirketin kurucusu Egem Eraslan, yeni ürünü bugün tanıttı.",
  "Dolar kuru gün içinde 41 lira seviyesinde işlem gördü.",
].join(" ");

function entity(patch: Partial<ExtractedEntity>): ExtractedEntity {
  return {
    name: "Midas",
    type: "COMPANY",
    role: "Ödeme sistemleri işine giren aracı kurum",
    excerpt: "Midas ödeme sistemleri işine giriyor.",
    ...patch,
  };
}

test("kanıtta birebir geçen varlık kabul edilir", () => {
  assert.equal(isGroundedInEvidence(entity({}), EVIDENCE), true);
});

test("kişi adı kanıttaki cümleyle eşleşiyorsa kabul edilir", () => {
  const person = entity({
    name: "Egem Eraslan",
    type: "PERSON",
    excerpt: "Şirketin kurucusu Egem Eraslan, yeni ürünü bugün tanıttı.",
  });
  assert.equal(isGroundedInEvidence(person, EVIDENCE), true);
});

test("kanıtta olmayan alıntı reddedilir — halüsinasyon kapısı", () => {
  const uydurma = entity({
    name: "Papara",
    excerpt: "Papara ödeme sistemleri işine giriyor.",
  });
  assert.equal(isGroundedInEvidence(uydurma, EVIDENCE), false);
});

test("alıntı kanıtta olsa bile ad o alıntıda geçmiyorsa reddedilir", () => {
  // Modelin sık yaptığı hata: doğru bir cümle kopyalayıp yanına alakasız
  // bir varlık adı yazmak. Ad-alıntı bağı aranmazsa bu geçerdi.
  const kopuk = entity({
    name: "Garanti Bankası",
    excerpt: "Midas ödeme sistemleri işine giriyor.",
  });
  assert.equal(isGroundedInEvidence(kopuk, EVIDENCE), false);
});

test("jenerik piyasa adları varlık sayılmaz", () => {
  // Bunlar tam olarak sitenin YARIŞAMADIĞI sorgular (GSC: 75-90. sıra).
  // Havuza girerlerse motor kendi amacını baltalar.
  const jenerik = entity({
    name: "Dolar",
    excerpt: "Dolar kuru gün içinde 41 lira seviyesinde işlem gördü.",
  });
  assert.equal(isGroundedInEvidence(jenerik, EVIDENCE), false);
});

test("boş veya çok kısa alıntı reddedilir", () => {
  assert.equal(isGroundedInEvidence(entity({ excerpt: "Midas" }), EVIDENCE), false);
});

test("Türkçe büyük İ aynı varlığı ikiye bölmez", () => {
  // Düz toLowerCase() "İŞ BANKASI" ve "İş Bankası" için farklı anahtar
  // üretiyordu; bu da mentions sayacını böler ve terfi eşiği hiç dolmaz.
  assert.equal(normalizeEntityKey("İŞ BANKASI"), normalizeEntityKey("İş Bankası"));
  assert.equal(normalizeEntityKey("Midas"), "midas");
});

test("aksanlı harfler tek anahtara indirgenir", () => {
  assert.equal(normalizeEntityKey("Türkiye İş Bankası"), "turkiye is bankasi");
});

test("sorgu kalıbı varlık tipine göre değişir", () => {
  // GSC'de gerçekten görülen kalıplar: kişi için "kimdir", şirket için
  // "sahibi kim" / "kurucu".
  assert.equal(entityKeywordTerm("Egem Eraslan", "PERSON"), "Egem Eraslan kimdir");
  assert.equal(entityKeywordTerm("Midas", "COMPANY"), "Midas nedir, sahibi kim");
});

/**
 * Özne kapısı: varlık, haberin KONUSU olmalı — kaynağı ya da liste dolgusu
 * değil. İlk canlı denemede model gazete adlarını (Takvim, Anadolu Ajansı)
 * ve "günün en çok yükselenleri" listesinden hisse kodlarını (THYAO, SUNTK)
 * varlık olarak döndürdü; bunlar hakkında yazacak hiçbir bilgi yok.
 */
const MANSET = "Midas ödeme sistemleri işine giriyor, kurucu Egem Eraslan açıkladı";
const KANIT_BASLIKLARI = ["Midas'tan ödeme atağı", "Egem Eraslan yeni ürünü tanıttı"];

test("manşette geçen varlık özne sayılır", () => {
  assert.equal(isStorySubject("Midas", MANSET, KANIT_BASLIKLARI), true);
  assert.equal(isStorySubject("Egem Eraslan", MANSET, KANIT_BASLIKLARI), true);
});

test("haberi yayımlayan gazete hiç kaydedilmez", () => {
  const gazete = entity({ name: "Anadolu Ajansı", type: "INSTITUTION" });
  assert.equal(isRecordableEntity(gazete).ok, false);
  assert.equal(isRecordableEntity(gazete).reason, "yayıncı");
});

test("hisse kodu kaydedilmez", () => {
  // THYAO/SUNTK/ESCOM "günün en çok yükselenleri" listesinden kopuyor;
  // haklarında 'listede vardı'dan başka bilgi yok.
  assert.equal(looksLikeTicker("THYAO"), true);
  assert.equal(looksLikeTicker("KENT"), true);
  assert.equal(looksLikeTicker("Midas"), false);
  assert.equal(looksLikeTicker("Koç Holding"), false);
});

test("liste cümlesinden gelen varlık kaydedilmez", () => {
  assert.equal(
    looksLikeEnumeration("Yükselenler: ASELS %4, TUPRS %3, KENT %2, ESCOM %2"),
    true,
  );
  assert.equal(looksLikeEnumeration("Midas ödeme sistemleri işine giriyor."), false);
});

test("kısaltma manşetle eşleşir — EPDK kendi haberinin öznesidir", () => {
  // Manşet kısaltmayı, model açık adı kullanıyor. Eşleşme olmazsa kurum
  // kendi haberinin öznesi sayılmıyordu.
  assert.equal(acronymOf("Enerji Piyasası Düzenleme Kurumu"), "epdk");
  assert.equal(
    isStorySubject("Enerji Piyasası Düzenleme Kurumu", "EPDK'dan doğal gaz tarifelerinde güncelleme", []),
    true,
  );
});

test("gövdede geçen gerçek özne kaydedilir, elenmesi terfiye bırakılır", () => {
  // Levent Çakıroğlu (Koç CEO'su) manşette geçmiyor ama "levent çakıroğlu
  // kimdir" tam olarak sitenin kazanabildiği sorgu tipi. Kayıt kapısı onu
  // geçirmeli; gürültüyü 2-makale eşiği süzer.
  const ceo = entity({
    name: "Levent Çakıroğlu",
    type: "PERSON",
    excerpt: "Şirketin kurucusu Egem Eraslan, yeni ürünü bugün tanıttı.",
  });
  assert.equal(isRecordableEntity(ceo).ok, true);
});

test("manşetin öznesi olan şirket kabul edilir", () => {
  assert.equal(
    isStorySubject("THY", "THY Yılın İlk Yarısında 18 Milyar Lira Kâr Etti", []),
    true,
  );
});
