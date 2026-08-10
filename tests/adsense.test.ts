import assert from "node:assert/strict";
import test from "node:test";
import { adsTxtRecord, normalizeAdsensePublisherId } from "../lib/adsense";

test("AdSense publisher kimliğini script biçimine normalize eder", () => {
  assert.equal(normalizeAdsensePublisherId("pub-1234567890123456"), "ca-pub-1234567890123456");
  assert.equal(normalizeAdsensePublisherId("ca-pub-1234567890123456"), "ca-pub-1234567890123456");
  assert.equal(normalizeAdsensePublisherId("yanlış"), null);
});

test("ads.txt kaydını Google yetkilendirme biçiminde üretir", () => {
  assert.equal(
    adsTxtRecord("ca-pub-1234567890123456"),
    "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0",
  );
});
