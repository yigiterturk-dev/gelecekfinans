import assert from "node:assert/strict";
import test from "node:test";
import {
  extractResolvedUrl, extractSignature, googleNewsArticleId, isGoogleNewsUrl,
} from "../lib/bot/google-news";
import { scoreSource } from "../lib/bot/autonomy";

const GOOGLE_LINK =
  "https://news.google.com/rss/articles/CBMi1wFBVV95cUxNUWJwQTl6enRoMzdud0o?oc=5";

test("Google Haberler yönlendirme linki tanınır, yayıncı linki tanınmaz", () => {
  assert.equal(isGoogleNewsUrl(GOOGLE_LINK), true);
  assert.equal(isGoogleNewsUrl("https://www.dunya.com/finans/altin/haber-1"), false);
  assert.equal(isGoogleNewsUrl(undefined), false);
  assert.equal(isGoogleNewsUrl("bozuk-url"), false);
});

test("makale kimliği yol içinden çıkarılır", () => {
  assert.equal(googleNewsArticleId(GOOGLE_LINK), "CBMi1wFBVV95cUxNUWJwQTl6enRoMzdud0o");
  assert.equal(googleNewsArticleId("https://news.google.com/rss/search?q=altin"), null);
});

test("imza ve zaman damgası olmadan istek kurulmaz", () => {
  const html = '<c-wiz data-n-a-ts="1788123737" data-n-a-sg="Ae5Wzi-RsV1sQDOGSSRzx3kyCwkv"></c-wiz>';
  assert.deepEqual(extractSignature(html), { ts: "1788123737", sg: "Ae5Wzi-RsV1sQDOGSSRzx3kyCwkv" });
  assert.equal(extractSignature('<c-wiz data-n-a-ts="1788123737"></c-wiz>'), null);
  assert.equal(extractSignature("<html></html>"), null);
});

test("batchexecute yanıtından Google dışı asıl adres alınır", () => {
  const payload =
    ')]}\'\n[["wrb.fr","Fbv4je","[\\"garturlres\\",\\"https:\\/\\/www.dunya.com\\/finans\\/altin\\/haber-838070\\"]",null,null,null,"generic"]]';
  assert.equal(extractResolvedUrl(payload), "https://www.dunya.com/finans/altin/haber-838070");
});

test("yalnızca Google adresleri dönen yanıt çözülmemiş sayılır", () => {
  const payload = '[["wrb.fr","Fbv4je","[\\"https:\\/\\/news.google.com\\/rss\\/articles\\/X\\"]"]]';
  assert.equal(extractResolvedUrl(payload), null);
});

test("çözülen yayıncı adresi kaynak skorunu otomatik yayın eşiğinin üstüne taşır", () => {
  const topic = {
    title: "Gram altın günü yükselişle kapattı", summary: "A".repeat(120),
    category: "altin", source: "Dünya Gazetesi",
  };
  const unresolved = scoreSource({ ...topic, sourceUrl: GOOGLE_LINK });
  const resolved = scoreSource({ ...topic, sourceUrl: "https://www.dunya.com/finans/altin/haber-838070" });
  assert.ok(unresolved.score < 75, "çözülmemiş Google linki eşiğin altında kalmalı");
  assert.ok(resolved.score >= 75, "çözülmüş yayıncı adresi eşiği geçmeli");
});
