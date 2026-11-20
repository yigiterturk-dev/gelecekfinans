// Google Dataset şeması: description 50–5000 karakter olmalı.
const EK = " Veriler gelecekfinans.com tarafından kamuya açık piyasa kaynaklarından derlenir ve düzenli güncellenir.";

export function datasetDescription(s: string): string {
  let d = (s || "").trim();
  if (d.length < 50) d = (d + EK).trim();
  return d.length > 5000 ? d.slice(0, 4997) + "..." : d;
}
