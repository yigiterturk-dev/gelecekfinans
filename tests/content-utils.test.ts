import assert from "node:assert/strict";
import test from "node:test";

import { readingTime } from "../lib/reading-time";
import { sanitizeArticleHtml } from "../lib/sanitize";
import { slugify } from "../lib/slug";
import {
  sanitizePreferences,
  signOptInToken,
  signUnsubToken,
  verifyOptInToken,
  verifyUnsubToken,
} from "../lib/newsletter";

function withNewsletterSecret(run: () => void) {
  const previous = process.env.NEWSLETTER_SECRET;
  process.env.NEWSLETTER_SECRET = "test-newsletter-secret-at-least-32-characters";
  try {
    run();
  } finally {
    if (previous === undefined) delete process.env.NEWSLETTER_SECRET;
    else process.env.NEWSLETTER_SECRET = previous;
  }
}

test("slugify Türkçe karakterleri ve tekrar eden ayraçları normalize eder", () => {
  assert.equal(slugify("  Çeyrek Altın -- Güncel Fiyatı!  "), "ceyrek-altin-guncel-fiyati");
});

test("slugify çıktısını 80 karakterle sınırlar", () => {
  assert.ok(slugify("a".repeat(120)).length <= 80);
});

test("readingTime boş içerikte sıfır döner", () => {
  assert.equal(readingTime("<p>   </p>"), "0 dk okuma");
});

test("readingTime HTML etiketlerini kelime saymaz", () => {
  assert.equal(readingTime(`<p>${"kelime ".repeat(201)}</p>`), "2 dk okuma");
});

test("sanitizeArticleHtml script ve tehlikeli bağlantıları temizler", () => {
  const clean = sanitizeArticleHtml('<script>alert(1)</script><a href="javascript:alert(1)" onclick="x()">ok</a>');
  assert.equal(clean.includes("<script"), false);
  assert.equal(clean.includes("javascript:"), false);
  assert.equal(clean.includes("onclick"), false);
});

test("sanitizeArticleHtml dış bağlantılara güvenli rel ekler", () => {
  const clean = sanitizeArticleHtml('<a href="https://example.com">kaynak</a>');
  assert.match(clean, /target="_blank"/);
  assert.match(clean, /rel="noopener noreferrer nofollow"/);
});

test("newsletter tercihleri yalnızca bilinen ve benzersiz segmentleri tutar", () => {
  assert.deepEqual(
    sanitizePreferences(["kripto", "kripto", "unknown", 42, "altin"]),
    ["kripto", "altin"]
  );
});

test("newsletter secret yoksa token üretimi fail-closed davranır", () => {
  const previous = process.env.NEWSLETTER_SECRET;
  delete process.env.NEWSLETTER_SECRET;
  const previousAuth = process.env.NEXTAUTH_SECRET;
  const previousCron = process.env.CRON_SECRET;
  delete process.env.NEXTAUTH_SECRET;
  delete process.env.CRON_SECRET;
  try {
    assert.equal(signOptInToken("reader@example.com"), null);
    assert.equal(signUnsubToken("reader@example.com"), null);
  } finally {
    if (previous === undefined) delete process.env.NEWSLETTER_SECRET;
    else process.env.NEWSLETTER_SECRET = previous;
    if (previousAuth === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = previousAuth;
    if (previousCron === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousCron;
  }
});

test("opt-in tokenı doğru e-postayı doğrular", () => {
  withNewsletterSecret(() => {
    const token = signOptInToken("reader@example.com");
    assert.equal(verifyOptInToken(token), "reader@example.com");
  });
});

test("süresi geçmiş veya oynanmış opt-in tokenı reddedilir", () => {
  withNewsletterSecret(() => {
    const expired = signOptInToken("reader@example.com", -1);
    assert.equal(verifyOptInToken(expired), null);
    const token = signOptInToken("reader@example.com")!;
    assert.equal(verifyOptInToken(`${token.slice(0, -1)}x`), null);
  });
});

test("opt-in ve unsubscribe tokenları amaçlar arasında yeniden kullanılamaz", () => {
  withNewsletterSecret(() => {
    const optIn = signOptInToken("reader@example.com");
    const unsubscribe = signUnsubToken("reader@example.com");
    assert.equal(verifyUnsubToken(optIn), null);
    assert.equal(verifyOptInToken(unsubscribe), null);
    assert.equal(verifyUnsubToken(unsubscribe), "reader@example.com");
  });
});
