import assert from "node:assert/strict";
import test from "node:test";
import {
  absoluteImageUrl,
  imageObjectLd,
  isGeneratedImage,
  publicImageUrl,
} from "../lib/image-url";

const BASE = "https://gelecekfinans.com";
const BLOB = "https://udf1gvmml4eb3pif.public.blob.vercel-storage.com/gorseller/enflasyon-nedir.png";

test("blob görseli kendi alan adımızdaki yola çevrilir", () => {
  assert.equal(publicImageUrl(BLOB), "/gorseller/enflasyon-nedir.png");
  assert.equal(absoluteImageUrl(BLOB, BASE), `${BASE}/gorseller/enflasyon-nedir.png`);
});

test("yabancı kaynak (Unsplash) olduğu gibi bırakılır", () => {
  const unsplash = "https://images.unsplash.com/photo-123";
  assert.equal(publicImageUrl(unsplash), unsplash);
  assert.equal(absoluteImageUrl(unsplash, BASE), unsplash);
});

test("görsel yoksa null döner, sitemap boş image:loc yazmaz", () => {
  assert.equal(publicImageUrl(null), null);
  assert.equal(publicImageUrl(""), null);
  assert.equal(absoluteImageUrl(undefined, BASE), null);
  assert.equal(imageObjectLd(null, BASE, "başlık"), null);
});

test("bizim ürettiğimiz görsel tanınır, boyut yalnızca ona yazılır", () => {
  assert.equal(isGeneratedImage(BLOB), true);
  assert.equal(isGeneratedImage("/gorseller/x.png"), true);
  assert.equal(isGeneratedImage("https://images.unsplash.com/photo-123"), false);

  const ours = imageObjectLd(BLOB, BASE, "Enflasyon nedir?", `${BASE}/x#primaryimage`);
  assert.deepEqual(ours, {
    "@type": "ImageObject",
    "@id": `${BASE}/x#primaryimage`,
    url: `${BASE}/gorseller/enflasyon-nedir.png`,
    caption: "Enflasyon nedir?",
    width: 1200,
    height: 675,
  });

  const foreign = imageObjectLd("https://images.unsplash.com/photo-123", BASE, "başlık");
  assert.equal("width" in foreign!, false, "boyutu bilinmeyen görsele ölçü uydurulmaz");
});

test("blob'a benzeyen ama farklı olan host'a dokunulmaz", () => {
  const sahte = "https://public.blob.vercel-storage.com.kotu.site/gorseller/a.png";
  assert.equal(publicImageUrl(sahte), sahte);
});
