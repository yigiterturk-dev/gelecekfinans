import assert from "node:assert/strict";
import test from "node:test";
import { buildImagePrompt, type VisualBrief } from "../lib/bot/visual-director";

const brief: VisualBrief = {
  mode: "DOCUMENTARY_SCENE",
  storyType: "energy-investment",
  subject: "solar energy investment",
  event: "a solar power installation entering operation",
  setting: "an anonymous industrial rooftop",
  mustShow: ["solar panels", "industrial roof"],
  mustAvoid: ["currency exchange office", "company logo"],
  peoplePolicy: "NO_PEOPLE",
  composition: "wide crop-safe composition",
  conceptKey: "industrial-solar-rooftop",
  rationale: "The headline concerns an energy facility, not currency.",
};

test("görsel promptu somut brief öğelerini ve yasakları taşır", () => {
  const prompt = buildImagePrompt(brief, "Şirket güneş enerjisi yatırımını devreye aldı");
  assert.match(prompt, /solar panels/);
  assert.match(prompt, /currency exchange office/);
  assert.match(prompt, /Absolutely no readable writing/);
  assert.match(prompt, /16:9 and 4:3/);
});

test("yeniden üretim geri bildirimi prompta eklenir", () => {
  const prompt = buildImagePrompt(brief, "Başlık", "Remove the fake sign");
  assert.match(prompt, /Remove the fake sign/);
});
