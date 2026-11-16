import assert from "node:assert/strict";
import test from "node:test";
import { INSTITUTIONS, matchInstitution, pickInstitutionPhoto } from "../lib/bot/institution-media";

const id = (u: string) => u;

test("kurum eşleşmesi: Fed/ECB, TCMB'den önce", () => {
  assert.equal(matchInstitution("ABD Merkez Bankası Powell açıklaması")?.id, "fed");
  assert.equal(matchInstitution("Avrupa Merkez Bankası faiz")?.id, "ecb");
  assert.equal(matchInstitution("Merkez Bankası politika faizini sabit tuttu")?.id, "tcmb");
  assert.equal(matchInstitution("Torba yasa Meclis'ten geçti")?.id, "tbmm");
  assert.equal(matchInstitution("Federal vergi"), null);
  assert.equal(matchInstitution("Asgari ücret 2027"), null);
});

test("kullanılan foto tekrar seçilmez, havuz tükenince null", () => {
  const used: Record<string, number> = {};
  const n = INSTITUTIONS.find((i) => i.id === "ecb")!.files.length;
  const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    const a = pickInstitutionPhoto("ECB faiz kararı", used, 7, id)!;
    assert.ok(!seen.has(a.assetId));
    seen.add(a.assetId);
    used[`${a.provider}:${a.assetId}`] = Date.now();
  }
  assert.equal(pickInstitutionPhoto("ECB faiz kararı", used, 7, id), null);
});

test("her dosya izinli lisansta ve Commons yüklemesinden", () => {
  const ok = new Set(["Kamu malı", "CC0", "CC BY 2.0", "CC BY-SA 2.5", "CC BY-SA 3.0", "CC BY-SA 4.0"]);
  for (const inst of INSTITUTIONS) for (const f of inst.files) {
    assert.ok(ok.has(f.license), f.file);
    assert.ok(f.author.length > 0, f.file);
    assert.match(f.url, /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/[0-9a-f]\/[0-9a-f]{2}\//);
  }
});
