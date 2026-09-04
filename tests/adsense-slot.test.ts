import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeAdsensePublisherId, adsTxtRecord } from "../lib/adsense";

test("publisher ID normalize edilir", () => {
  assert.equal(normalizeAdsensePublisherId("ca-pub-1234567890123456"), "ca-pub-1234567890123456");
  assert.equal(normalizeAdsensePublisherId("pub-1234567890123456"), "ca-pub-1234567890123456");
  assert.equal(normalizeAdsensePublisherId("CA-PUB-1234567890123456"), "ca-pub-1234567890123456");
});

test("geçersiz publisher ID null döner", () => {
  assert.equal(normalizeAdsensePublisherId(""), null);
  assert.equal(normalizeAdsensePublisherId("ca-pub-abc"), null);
  assert.equal(normalizeAdsensePublisherId(undefined), null);
});

test("ads.txt kaydı doğru biçimde üretilir", () => {
  assert.equal(
    adsTxtRecord("ca-pub-1234567890123456"),
    "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0",
  );
  assert.equal(adsTxtRecord(""), null);
});
